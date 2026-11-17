-- Night City: the driving script.
--
-- Draws the whole scene on a GPU canvas each frame: sky, ground, towers and
-- traffic, then the hovercar's cockpit in front of it. The dashboard screens,
-- the windshield display and every billboard are other artboards in this
-- file. The script keeps an instance of each, advances their state machines,
-- draws them into 2D canvases and uses those canvases as textures in 3D.
-- It also writes the car's speed, altitude and heading into their view
-- models, and turns a click on the picture into a click on the artboard the
-- pointer's ray lands on.

local CELL = 100 -- one block plus one road
local BLOCKS = 16 -- blocks per side before the city repeats
local CITY = CELL * BLOCKS
local FOV = math.rad(62)
local KMH = 2.5 -- display km/h per world unit per second

type Box = { cx: number, cz: number, hw: number, hd: number, base: number, top: number }

type Sign = {
    art: Artboard<Data.Ad>,
    canvas: Canvas,
    bind: GPUBindGroup,
    ubo: GPUBuffer,
    bytes: buffer,
    -- where it stands: centre, the way it faces, size
    x: number,
    y: number,
    z: number,
    nx: number,
    nz: number,
    w: number,
    h: number,
    -- this frame: the copy of it nearest the camera
    wx: number,
    wz: number,
    dist: number,
    visible: boolean,
    drawn: boolean,
}

type Panel = {
    canvas: Canvas,
    bind: GPUBindGroup,
    ubo: GPUBuffer,
    bytes: buffer,
    model: Mat4,
    -- top-left corner and the two edges from it, in the camera's space
    ox: number,
    oy: number,
    oz: number,
    ux: number,
    uy: number,
    uz: number,
    vx: number,
    vy: number,
    vz: number,
    pw: number,
    ph: number,
}

type Gfx = {
    canvas: GPUCanvas,
    depth: GPUTexture,
    depthView: GPUTextureView,
    width: number,
    height: number,
    globals: GPUBuffer,
    globalsBind: GPUBindGroup,
    sky: GPUPipeline,
    ground: GPUPipeline,
    building: GPUPipeline,
    traffic: GPUPipeline,
    signPipe: GPUPipeline,
    screenPipe: GPUPipeline,
    glassPipe: GPUPipeline,
    cockpitPipe: GPUPipeline,
    boxVerts: GPUBuffer,
    buildingInst: GPUBuffer,
    buildingCount: number,
    trafficInst: GPUBuffer,
    trafficCount: number,
    quadVerts: GPUBuffer,
    cockpitVerts: GPUBuffer,
    cockpitCount: number,
    cockpitUbo: GPUBuffer,
    cockpitBind: GPUBindGroup,
}

type City = {
    speedo: Input<Artboard<Data.Dash>>,
    nav: Input<Artboard<Data.Dash>>,
    hud: Input<Artboard<Data.Dash>>,
    ad1: Input<Artboard<Data.Ad>>,
    ad2: Input<Artboard<Data.Ad>>,
    ad3: Input<Artboard<Data.Ad>>,
    ad4: Input<Artboard<Data.Ad>>,
    ad5: Input<Artboard<Data.Ad>>,

    gfx: Gfx?,
    speedoArt: Artboard<Data.Dash>?,
    navArt: Artboard<Data.Dash>?,
    hudArt: Artboard<Data.Dash>?,
    speedoPanel: Panel?,
    navPanel: Panel?,
    hudPanel: Panel?,
    signs: { Sign },
    boxes: { { Box } }, -- by block: the tower and anything stacked on it

    size: Vector,
    pixelScale: number,
    time: number,

    -- the car
    px: number,
    py: number,
    pz: number,
    yaw: number,
    roll: number,
    pitch: number,
    speed: number,
    power: number,
    boost: number,
    boosting: boolean,
    warning: boolean,
    autopilot: boolean,
    tagged: number,

    -- input
    keys: { [number]: boolean },
    padSteer: number,
    padThrottle: number,
    padLift: number,
    padBoost: boolean,
    dragging: boolean,
    dragX: number,
    dragY: number,
    dragSteer: number,
    dragLift: number,
    pressKind: string,
    pressIndex: number,
    hoverKind: string,
    hoverIndex: number,

    -- camera, rebuilt each frame
    rx: number,
    ry: number,
    rz: number,
    ux: number,
    uy: number,
    uz: number,
    fx: number,
    fy: number,
    fz: number,
    globalBytes: buffer,
    cockpitBytes: buffer,
}

-- ------------------------------------------------------------------ helpers

-- The same city every time, whatever the clock says.
local seed = 20261117
local function rnd(): number
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
end

local function clamp(v: number, lo: number, hi: number): number
    if v < lo then
        return lo
    elseif v > hi then
        return hi
    end
    return v
end

-- The lens the cockpit is drawn through. On a tall, narrow screen it widens
-- so both dash screens and the windshield display still fit side by side.
local function cockpitFov(aspect: number): number
    return math.max(FOV, 2 * math.atan(0.62 / aspect))
end

local function approach(v: number, target: number, rate: number, dt: number): number
    return v + (target - v) * (1 - math.exp(-rate * dt))
end

-- Signed distance from a to the nearest copy of b in the repeating city.
local function wrapDelta(d: number): number
    return d - CITY * math.floor(d / CITY + 0.5)
end

local function putVec4(b: buffer, offset: number, x: number, y: number, z: number, w: number)
    buffer.writef32(b, offset, x)
    buffer.writef32(b, offset + 4, y)
    buffer.writef32(b, offset + 8, z)
    buffer.writef32(b, offset + 12, w)
end

-- ------------------------------------------------------------------ geometry

-- A box from -1..1 in x and z and 0..1 in y, with face normals: 36 vertices.
local function boxMesh(): buffer
    local faces = {
        -- normal, then four corners counter-clockwise seen from outside
        { 1, 0, 0, 1, 0, 1, 1, 0, -1, 1, 1, -1, 1, 1, 1 },
        { -1, 0, 0, -1, 0, -1, -1, 0, 1, -1, 1, 1, -1, 1, -1 },
        { 0, 0, 1, -1, 0, 1, 1, 0, 1, 1, 1, 1, -1, 1, 1 },
        { 0, 0, -1, 1, 0, -1, -1, 0, -1, -1, 1, -1, 1, 1, -1 },
        { 0, 1, 0, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1 },
        { 0, -1, 0, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1 },
    }
    local b = buffer.create(36 * 24)
    local o = 0
    for _, f in ipairs(faces) do
        for _, corner in ipairs({ 0, 1, 2, 0, 2, 3 }) do
            local c = 4 + corner * 3
            buffer.writef32(b, o, f[c])
            buffer.writef32(b, o + 4, f[c + 1])
            buffer.writef32(b, o + 8, f[c + 2])
            buffer.writef32(b, o + 12, f[1])
            buffer.writef32(b, o + 16, f[2])
            buffer.writef32(b, o + 20, f[3])
            o += 24
        end
    end
    return b
end

-- A unit quad: position (u, v, 0) and the same (u, v) as texture coordinate,
-- with v running down the picture. A model matrix places it.
local function quadMesh(): buffer
    local b = buffer.create(6 * 20)
    local uv = { 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1 }
    for i = 0, 5 do
        local u, v = uv[i * 2 + 1], uv[i * 2 + 2]
        buffer.writef32(b, i * 20, u)
        buffer.writef32(b, i * 20 + 4, v)
        buffer.writef32(b, i * 20 + 8, 0)
        buffer.writef32(b, i * 20 + 12, u)
        buffer.writef32(b, i * 20 + 16, v)
    end
    return b
end

-- The model matrix for a quad with its top-left corner at o and edges u
-- (along the top) and v (down the side).
local function quadMatrix(ox: number, oy: number, oz: number, ux: number, uy: number, uz: number, vx: number, vy: number, vz: number): Mat4
    return Mat4.values(ux, uy, uz, 0, vx, vy, vz, 0, 0, 0, 1, 0, ox, oy, oz, 1)
end

-- The interior of the car, as flat quads in the camera's space (x right,
-- y up, -z ahead), listed far to near because they are drawn without a
-- depth test. Each quad: four corners, then r, g, b and how much it glows.
-- The first two are the roof, which is left out on a tall, narrow screen.
local function cockpitMesh(): (buffer, number)
    local trim = { 0.045, 0.05, 0.085 }
    local dark = { 0.02, 0.022, 0.04 }
    local quads: { { number } } = {
        -- roof header and its light
        { -1.6, 3, -0.8, 1.6, 3, -0.8, 1.6, 0.435, -0.8, -1.6, 0.435, -0.8, dark[1], dark[2], dark[3], 0 },
        { -0.5, 0.445, -0.8, 0.5, 0.445, -0.8, 0.5, 0.435, -0.8, -0.5, 0.435, -0.8, 1.0, 0.24, 0.65, 1 },
        -- pillars either side of the windshield
        { -1.02, 0.62, -0.7, -0.84, 0.62, -0.7, -1.2, -0.22, -1.3, -1.5, -0.22, -1.3, dark[1], dark[2], dark[3], 0 },
        { 0.84, 0.62, -0.7, 1.02, 0.62, -0.7, 1.5, -0.22, -1.3, 1.2, -0.22, -1.3, dark[1], dark[2], dark[3], 0 },
        -- the top of the dash, sloping away under the glass
        { -1.5, -0.21, -1.4, 1.5, -0.21, -1.4, 1.7, -0.14, -0.62, -1.7, -0.14, -0.62, dark[1], dark[2], dark[3], 0 },
        -- a line of light where the dash meets the glass
        { -1.5, -0.203, -1.4, 1.5, -0.203, -1.4, 1.5, -0.21, -1.38, -1.5, -0.21, -1.38, 0.1, 0.9, 1.0, 1 },
        -- the face of the dash, where the screens sit
        { -1.7, -0.14, -0.62, 1.7, -0.14, -0.62, 1.7, -3.2, -0.314, -1.7, -3.2, -0.314, trim[1], trim[2], trim[3], 0 },
        { -1.7, -0.135, -0.62, 1.7, -0.135, -0.62, 1.7, -0.143, -0.62, -1.7, -0.143, -0.62, 1.0, 0.24, 0.65, 1 },
        -- vents either side of the screens
        { -0.86, -0.19, -0.615, -0.5, -0.19, -0.615, -0.5, -0.195, -0.614, -0.86, -0.195, -0.614, 0.1, 0.9, 1.0, 1 },
        { -0.86, -0.23, -0.611, -0.5, -0.23, -0.611, -0.5, -0.235, -0.61, -0.86, -0.235, -0.61, 0.1, 0.9, 1.0, 1 },
        { 0.5, -0.19, -0.615, 0.86, -0.19, -0.615, 0.86, -0.195, -0.614, 0.5, -0.195, -0.614, 0.1, 0.9, 1.0, 1 },
        { 0.5, -0.23, -0.611, 0.86, -0.23, -0.611, 0.86, -0.235, -0.61, 0.5, -0.235, -0.61, 0.1, 0.9, 1.0, 1 },
    }
    local b = buffer.create(#quads * 6 * 28)
    local o = 0
    for _, q in ipairs(quads) do
        for _, corner in ipairs({ 0, 1, 2, 0, 2, 3 }) do
            local c = corner * 3
            buffer.writef32(b, o, q[c + 1])
            buffer.writef32(b, o + 4, q[c + 2])
            buffer.writef32(b, o + 8, q[c + 3])
            buffer.writef32(b, o + 12, q[13])
            buffer.writef32(b, o + 16, q[14])
            buffer.writef32(b, o + 20, q[15])
            buffer.writef32(b, o + 24, q[16])
            o += 28
        end
    end
    return b, #quads * 6
end

-- ------------------------------------------------------------------ the city

type SignSpot = { x: number, y: number, z: number, nx: number, nz: number, w: number, design: number }

-- Signs hang over junctions, where no tower is in the way, facing the
-- traffic that comes towards them. The car starts on the avenue x = 8 blocks, heading -z.
local SIGN_SPOTS: { SignSpot } = {
    { x = 8 * CELL, y = 54, z = 6 * CELL, nx = 0, nz = 1, w = 48, design = 1 },
    { x = 8 * CELL, y = 60, z = 2 * CELL, nx = 0, nz = 1, w = 48, design = 2 },
    { x = 8 * CELL, y = 54, z = 14 * CELL, nx = 0, nz = 1, w = 48, design = 3 },
    { x = 4 * CELL, y = 54, z = 8 * CELL, nx = 1, nz = 0, w = 48, design = 4 },
    { x = 12 * CELL, y = 58, z = 8 * CELL, nx = -1, nz = 0, w = 48, design = 5 },
    { x = 8 * CELL, y = 56, z = 10 * CELL, nx = 0, nz = -1, w = 48, design = 5 },
    { x = 4 * CELL, y = 62, z = 4 * CELL, nx = 0.7071, nz = 0.7071, w = 44, design = 3 },
    { x = 12 * CELL, y = 62, z = 12 * CELL, nx = -0.7071, nz = -0.7071, w = 44, design = 4 },
}

-- Lays out the towers. Returns the instance data for the GPU and the boxes
-- the car can hit, indexed by block.
local function buildCity(): (buffer, number, { { Box } })
    local inst: { number } = {}
    local boxes: { { Box } } = {}
    local count = 0
    local function add(cx: number, cz: number, hw: number, hd: number, height: number, s: number, base: number)
        table.insert(inst, cx)
        table.insert(inst, cz)
        table.insert(inst, hw)
        table.insert(inst, hd)
        table.insert(inst, height)
        table.insert(inst, s)
        table.insert(inst, base)
        table.insert(inst, 0)
        count += 1
    end
    for j = 0, BLOCKS - 1 do
        for i = 0, BLOCKS - 1 do
            local cx, cz = (i + 0.5) * CELL, (j + 0.5) * CELL
            local list: { Box } = {}
            local r = rnd()
            local hw, hd = 16 + rnd() * 12, 16 + rnd() * 12
            local height = 16 + r * r * 150
            if rnd() < 0.07 then
                height = 6 + rnd() * 6 -- a plaza
            end
            local s = rnd()
            add(cx, cz, hw, hd, height, s, 0)
            table.insert(list, { cx = cx, cz = cz, hw = hw, hd = hd, base = 0, top = height })
            if height > 60 then
                -- a narrower crown on the tall ones
                local k = 0.45 + rnd() * 0.3
                local extra = 14 + rnd() * 46
                add(cx, cz, hw * k, hd * k, extra, s + 0.37, height)
                table.insert(list, { cx = cx, cz = cz, hw = hw * k, hd = hd * k, base = height, top = height + extra })
                if rnd() < 0.5 then
                    add(cx, cz, 0.7, 0.7, 18 + rnd() * 20, s + 0.61, height + extra) -- mast
                end
            end
            boxes[j * BLOCKS + i + 1] = list
        end
    end
    -- two posts under every sign
    for _, spot in ipairs(SIGN_SPOTS) do
        local h = spot.w * 9 / 16
        local tx, tz = spot.nz, -spot.nx
        for _, side in ipairs({ -1, 1 }) do
            local reach = side * (spot.w / 2 + 0.8)
            add(spot.x + tx * reach, spot.z + tz * reach, 0.8, 0.8, spot.y + h / 2 + 1.5, 0.21 * (spot.design + 1), 0)
        end
    end
    local b = buffer.create(count * 32)
    for k, v in ipairs(inst) do
        buffer.writef32(b, (k - 1) * 4, v)
    end
    return b, count, boxes
end

-- Other people's cars: light trails along every road, on several levels.
local function buildTraffic(): (buffer, number)
    local levels = { 7, 17, 46, 72 }
    local inst: { number } = {}
    local count = 0
    for axis = 0, 1 do
        for road = 0, BLOCKS - 1 do
            for n = 1, 12 do
                local dir = if n % 2 == 0 then 1 else -1
                local level = levels[1 + math.floor(rnd() * #levels)]
                table.insert(inst, road)
                table.insert(inst, level + rnd() * 2)
                table.insert(inst, rnd() * CITY)
                table.insert(inst, dir * (26 + rnd() * 40))
                table.insert(inst, axis)
                table.insert(inst, dir * (3.5 + rnd() * 5) * (if axis == 0 then -1 else 1))
                table.insert(inst, rnd())
                table.insert(inst, 0)
                count += 1
            end
        end
    end
    local b = buffer.create(count * 32)
    for k, v in ipairs(inst) do
        buffer.writef32(b, (k - 1) * 4, v)
    end
    return b, count
end

-- ------------------------------------------------------------------ setup

local function makePanel(context: Context, layout: GPUBindGroupLayout, sampler: GPUSampler, pw: number, ph: number, cx: number, cy: number, cz: number, width: number, tilt: number): Panel
    local canvas = context:canvas({ width = pw, height = ph })
    local ubo = GPUBuffer.new({ size = 96, usage = 'uniform' })
    local height = width * ph / pw
    -- edges: u runs right, v runs down and (for a tilted screen) towards the driver
    local vx, vy, vz = 0, -height * math.cos(tilt), height * math.sin(tilt)
    local ox, oy, oz = cx - width / 2, cy - vy / 2, cz - vz / 2
    return {
        canvas = canvas,
        ubo = ubo,
        bytes = buffer.create(96),
        bind = GPUBindGroup.new({
            layout = layout,
            ubos = { { slot = 0, buffer = ubo } },
            textures = { { slot = 1, view = canvas.image:view() } },
            samplers = { { slot = 2, sampler = sampler } },
        }),
        model = quadMatrix(ox, oy, oz, width, 0, 0, vx, vy, vz),
        ox = ox,
        oy = oy,
        oz = oz,
        ux = width,
        uy = 0,
        uz = 0,
        vx = vx,
        vy = vy,
        vz = vz,
        pw = pw,
        ph = ph,
    }
end

local function makeTargets(width: number, height: number): (GPUTexture, GPUTextureView)
    local depth = GPUTexture.new({ width = width, height = height, format = 'depth32float', renderTarget = true })
    return depth, depth:view()
end

local function init(self: City, context: Context): boolean
    local world = context:shader('shaders/world')
    local quad = context:shader('shaders/quad')
    local cockpit = context:shader('shaders/cockpit')
    if not world or not quad or not cockpit then
        print('night city: a shader is missing')
        return false
    end

    local width, height = 1280, 720
    local canvas = context:gpuCanvas({ width = width, height = height })
    local depth, depthView = makeTargets(width, height)
    local format = canvas.format
    local depthFormat: DepthFormat = 'depth32float'
    local solid: DepthStencilState = { format = depthFormat, compare = 'less-equal', write = true }
    local overlay: DepthStencilState = { format = depthFormat, compare = 'always', write = false }

    -- the world: four pipelines over one set of per-frame uniforms
    local worldLayout = GPUBindGroupLayout.new({ shader = world, groupIndex = 0 })
    local boxLayout: { VertexBufferLayout } = {
        { stride = 24, attributes = { { format = 'float32x3', slot = 0, offset = 0 }, { format = 'float32x3', slot = 1, offset = 12 } } },
        { stride = 32, stepMode = 'instance', attributes = { { format = 'float32x4', slot = 2, offset = 0 }, { format = 'float32x4', slot = 3, offset = 16 } } },
    }
    local sky = GPUPipeline.new({
        vertex = { module = world, entryPoint = 'vs_sky' },
        fragment = { module = world, entryPoint = 'fs_sky' },
        vertexLayout = {},
        bindGroupLayouts = { worldLayout },
        colorTargets = { { format = format } },
        depthStencil = overlay,
    })
    local ground = GPUPipeline.new({
        vertex = { module = world, entryPoint = 'vs_ground' },
        fragment = { module = world, entryPoint = 'fs_ground' },
        vertexLayout = {},
        bindGroupLayouts = { worldLayout },
        colorTargets = { { format = format } },
        depthStencil = solid,
    })
    local building = GPUPipeline.new({
        vertex = { module = world, entryPoint = 'vs_building' },
        fragment = { module = world, entryPoint = 'fs_building' },
        vertexLayout = boxLayout,
        bindGroupLayouts = { worldLayout },
        colorTargets = { { format = format } },
        depthStencil = solid,
    })
    local traffic = GPUPipeline.new({
        vertex = { module = world, entryPoint = 'vs_traffic' },
        fragment = { module = world, entryPoint = 'fs_traffic' },
        vertexLayout = boxLayout,
        bindGroupLayouts = { worldLayout },
        colorTargets = { { format = format } },
        depthStencil = solid,
    })
    local globals = GPUBuffer.new({ size = 144, usage = 'uniform' })
    local globalsBind = GPUBindGroup.new({ layout = worldLayout, ubos = { { slot = 0, buffer = globals } } })

    -- textured quads: signs in the world, screens and the display in the car
    local quadLayout = GPUBindGroupLayout.new({ shader = quad, groupIndex = 0 })
    local quadVertexLayout: { VertexBufferLayout } = {
        { stride = 20, attributes = { { format = 'float32x3', slot = 0, offset = 0 }, { format = 'float32x2', slot = 1, offset = 12 } } },
    }
    local signPipe = GPUPipeline.new({
        vertex = { module = quad, entryPoint = 'vs_quad' },
        fragment = { module = quad, entryPoint = 'fs_panel' },
        vertexLayout = quadVertexLayout,
        bindGroupLayouts = { quadLayout },
        colorTargets = { { format = format } },
        depthStencil = solid,
    })
    local screenPipe = GPUPipeline.new({
        vertex = { module = quad, entryPoint = 'vs_quad' },
        fragment = { module = quad, entryPoint = 'fs_panel' },
        vertexLayout = quadVertexLayout,
        bindGroupLayouts = { quadLayout },
        colorTargets = { { format = format } },
        depthStencil = overlay,
    })
    local glassPipe = GPUPipeline.new({
        vertex = { module = quad, entryPoint = 'vs_quad' },
        fragment = { module = quad, entryPoint = 'fs_glass' },
        vertexLayout = quadVertexLayout,
        bindGroupLayouts = { quadLayout },
        colorTargets = { { format = format, blend = { srcColor = 'one', dstColor = 'one', srcAlpha = 'zero', dstAlpha = 'one' } } },
        depthStencil = overlay,
    })
    local cockpitPipe = GPUPipeline.new({
        vertex = { module = cockpit, entryPoint = 'vs_cockpit' },
        fragment = { module = cockpit, entryPoint = 'fs_cockpit' },
        vertexLayout = {
            { stride = 28, attributes = { { format = 'float32x3', slot = 0, offset = 0 }, { format = 'float32x4', slot = 1, offset = 12 } } },
        },
        colorTargets = { { format = format } },
        depthStencil = overlay,
    })
    local cockpitUbo = GPUBuffer.new({ size = 80, usage = 'uniform' })

    local boxData = boxMesh()
    local quadData = quadMesh()
    local cockpitData, cockpitCount = cockpitMesh()
    seed = 20261117
    local buildingData, buildingCount, boxes = buildCity()
    local trafficData, trafficCount = buildTraffic()
    self.boxes = boxes

    self.gfx = {
        canvas = canvas,
        depth = depth,
        depthView = depthView,
        width = width,
        height = height,
        globals = globals,
        globalsBind = globalsBind,
        sky = sky,
        ground = ground,
        building = building,
        traffic = traffic,
        signPipe = signPipe,
        screenPipe = screenPipe,
        glassPipe = glassPipe,
        cockpitPipe = cockpitPipe,
        boxVerts = GPUBuffer.new({ size = buffer.len(boxData), usage = 'vertex', data = boxData, immutable = true }),
        buildingInst = GPUBuffer.new({ size = buffer.len(buildingData), usage = 'vertex', data = buildingData, immutable = true }),
        buildingCount = buildingCount,
        trafficInst = GPUBuffer.new({ size = buffer.len(trafficData), usage = 'vertex', data = trafficData, immutable = true }),
        trafficCount = trafficCount,
        quadVerts = GPUBuffer.new({ size = buffer.len(quadData), usage = 'vertex', data = quadData, immutable = true }),
        cockpitVerts = GPUBuffer.new({ size = buffer.len(cockpitData), usage = 'vertex', data = cockpitData, immutable = true }),
        cockpitCount = cockpitCount,
        cockpitUbo = cockpitUbo,
        cockpitBind = GPUBindGroup.new({ layout = cockpitPipe:getBindGroupLayout(0), ubos = { { slot = 0, buffer = cockpitUbo } } }),
    }

    -- the car's own displays
    local sampler = GPUSampler.new({})
    local speedoArt = self.speedo:instance()
    local navArt = self.nav:instance()
    local hudArt = self.hud:instance()
    speedoArt:advance(0)
    navArt:advance(0)
    hudArt:advance(0)
    self.speedoArt = speedoArt
    self.navArt = navArt
    self.hudArt = hudArt
    -- two screens leaning back on the dash, and the display floating in the glass
    self.speedoPanel = makePanel(context, quadLayout, sampler, 512, 320, -0.172, -0.243, -0.603, 0.3, 0.1)
    self.navPanel = makePanel(context, quadLayout, sampler, 512, 320, 0.172, -0.243, -0.603, 0.3, 0.1)
    self.hudPanel = makePanel(context, quadLayout, sampler, 1024, 384, 0, 0.15, -1.0, 1.0, 0)

    -- the billboards: every sign is its own instance, with its own state
    local designs = { self.ad1, self.ad2, self.ad3, self.ad4, self.ad5 }
    self.signs = {}
    for _, spot in ipairs(SIGN_SPOTS) do
        local art = designs[spot.design]:instance()
        art:advance(0)
        local signCanvas = context:canvas({ width = 640, height = 360 })
        local ubo = GPUBuffer.new({ size = 96, usage = 'uniform' })
        table.insert(self.signs, {
            art = art,
            canvas = signCanvas,
            ubo = ubo,
            bytes = buffer.create(96),
            bind = GPUBindGroup.new({
                layout = quadLayout,
                ubos = { { slot = 0, buffer = ubo } },
                textures = { { slot = 1, view = signCanvas.image:view() } },
                samplers = { { slot = 2, sampler = sampler } },
            }),
            x = spot.x,
            y = spot.y,
            z = spot.z,
            nx = spot.nx,
            nz = spot.nz,
            w = spot.w,
            h = spot.w * 9 / 16,
            wx = spot.x,
            wz = spot.z,
            dist = 0,
            visible = true,
            drawn = false,
        })
    end
    return true
end

local function resize(self: City, size: Vector, scale: number)
    self.size = size
    self.pixelScale = scale
    local gfx = self.gfx
    if gfx == nil or size.x < 2 or size.y < 2 then
        return
    end
    -- device pixels, capped so a huge window does not sink the frame rate
    local k = math.min(scale, 1920 / size.x)
    local width, height = math.floor(size.x * k + 0.5), math.floor(size.y * k + 0.5)
    if width ~= gfx.width or height ~= gfx.height then
        gfx.canvas:resize(width, height)
        gfx.depth, gfx.depthView = makeTargets(width, height)
        gfx.width, gfx.height = width, height
    end
end

-- ------------------------------------------------------------------ driving

local function held(self: City, a: number, b: number): boolean
    return self.keys[a] == true or self.keys[b] == true
end

-- True when the point is inside a tower, with some clearance.
local function blocked(self: City, x: number, y: number, z: number, margin: number): boolean
    local wx, wz = x % CITY, z % CITY
    local list = self.boxes[math.floor(wz / CELL) * BLOCKS + math.floor(wx / CELL) + 1]
    if list == nil then
        return false
    end
    for _, b in ipairs(list) do
        if math.abs(wx - b.cx) < b.hw + margin and math.abs(wz - b.cz) < b.hd + margin and y > b.base - margin and y < b.top + margin then
            return true
        end
    end
    return false
end

-- Pushes the car out of whatever tower it has flown into.
local function collide(self: City): boolean
    local margin = 2.5
    local wx, wz = self.px % CITY, self.pz % CITY
    local list = self.boxes[math.floor(wz / CELL) * BLOCKS + math.floor(wx / CELL) + 1]
    if list == nil then
        return false
    end
    local hit = false
    for _, b in ipairs(list) do
        local dx, dz = wx - b.cx, wz - b.cz
        local ox, oz = b.hw + margin - math.abs(dx), b.hd + margin - math.abs(dz)
        local oyTop, oyBase = b.top + margin - self.py, self.py - (b.base - margin)
        if ox > 0 and oz > 0 and oyTop > 0 and oyBase > 0 then
            hit = true
            if oyTop < 3 and oyTop < ox and oyTop < oz then
                self.py += oyTop -- skim over the roof
            elseif ox < oz then
                self.px += if dx > 0 then ox else -ox
            else
                self.pz += if dz > 0 then oz else -oz
            end
        end
    end
    return hit
end

local function drive(self: City, dt: number)
    local throttle = (if held(self, 87, 265) then 1 else 0) - (if held(self, 83, 264) then 1 else 0) + self.padThrottle
    local steer = (if held(self, 68, 262) then 1 else 0) - (if held(self, 65, 263) then 1 else 0) + self.padSteer + self.dragSteer
    local lift = (if held(self, 69, 82) or self.keys[266] == true then 1 else 0)
        - (if held(self, 81, 70) or self.keys[267] == true then 1 else 0)
        + self.padLift
        + self.dragLift
    local wantBoost = held(self, 32, 340) or self.padBoost
    throttle = clamp(throttle, -1, 1)
    steer = clamp(steer, -1, 1)
    lift = clamp(lift, -1, 1)
    if throttle ~= 0 or steer ~= 0 or lift ~= 0 or wantBoost then
        self.autopilot = false
    end

    self.boosting = wantBoost and self.power > 1
    if self.boosting then
        self.power = math.max(0, self.power - 20 * dt)
    else
        self.power = math.min(100, self.power + 8 * dt)
    end
    self.boost = approach(self.boost, if self.boosting then 1 else 0, 5, dt)

    if self.autopilot then
        self.speed = approach(self.speed, 38, 1.5, dt) -- cruise straight down the avenue
    else
        local accel = 0
        if self.boosting then
            accel = 72
        elseif throttle > 0 then
            accel = 45 * throttle
        elseif throttle < 0 then
            accel = 70 * throttle
        end
        self.speed += (accel - 0.45 * self.speed) * dt
        self.speed = clamp(self.speed, -18, 170)
    end

    local grip = 0.45 + 0.55 * math.min(1, math.abs(self.speed) / 40)
    self.yaw += steer * 1.15 * grip * dt * (if self.speed < -1 then -1 else 1)
    self.roll = approach(self.roll, -steer * 0.3 * grip, 4, dt)
    self.pitch = approach(self.pitch, lift * 0.12, 4, dt)
    self.py = clamp(self.py + lift * 26 * dt, 4, 240)

    local sx, sz = math.sin(self.yaw), -math.cos(self.yaw)
    self.px += sx * self.speed * dt
    self.pz += sz * self.speed * dt
    if collide(self) then
        self.speed -= self.speed * math.min(1, 4 * dt)
    end
    -- keep the numbers small: the city repeats, so nothing is lost
    self.px %= CITY
    self.pz %= CITY

    local reach = math.max(18, self.speed * 0.9)
    self.warning = self.py < 6.5 or blocked(self, self.px + sx * reach, self.py, self.pz + sz * reach, 3) or blocked(self, self.px + sx * reach * 0.5, self.py, self.pz + sz * reach * 0.5, 3)
end

-- Writes what the car knows into a display's view model. Its binds and
-- state machine take it from there.
local function feed(self: City, art: Artboard<Data.Dash>)
    local d = art.data
    d.speed.value = math.abs(self.speed) * KMH
    d.altitude.value = self.py
    d.heading.value = math.deg(self.yaw) % 360
    d.boost.value = self.boosting
    d.warning.value = self.warning
    d.tagged.value = self.tagged
    d.power.value = self.power
    d.posX.value = self.px
    d.posZ.value = self.pz
end

local function advance(self: City, seconds: number): boolean
    local dt = math.min(seconds, 0.05)
    self.time = (self.time + dt) % 3600
    drive(self, dt)

    -- the camera: where the driver's eyes are, and which way they point
    local cp, sp = math.cos(self.pitch), math.sin(self.pitch)
    local fx, fy, fz = math.sin(self.yaw) * cp, sp, -math.cos(self.yaw) * cp
    local hx, hz = math.cos(self.yaw), math.sin(self.yaw) -- level right
    local cr, sr = math.cos(self.roll), math.sin(self.roll)
    -- the driver's up, leaning into the turn
    local ux0, uy0, uz0 = -hx * sr, cr, -hz * sr
    -- right = forward x up, then up = right x forward, so all three are square
    local rx, ry, rz = fy * uz0 - fz * uy0, fz * ux0 - fx * uz0, fx * uy0 - fy * ux0
    local rl = math.sqrt(rx * rx + ry * ry + rz * rz)
    rx, ry, rz = rx / rl, ry / rl, rz / rl
    self.rx, self.ry, self.rz = rx, ry, rz
    self.ux, self.uy, self.uz = ry * fz - rz * fy, rz * fx - rx * fz, rx * fy - ry * fx
    self.fx, self.fy, self.fz = fx, fy, fz

    local speedoArt, navArt, hudArt = self.speedoArt, self.navArt, self.hudArt
    if speedoArt and navArt and hudArt then
        feed(self, speedoArt)
        feed(self, navArt)
        feed(self, hudArt)
        speedoArt:advance(dt)
        navArt:advance(dt)
        hudArt:advance(dt)
    end

    -- signs: find the nearest copy of each, and keep the ones in view alive
    for _, s in ipairs(self.signs) do
        local dx, dz = wrapDelta(s.x - self.px), wrapDelta(s.z - self.pz)
        s.wx, s.wz = self.px + dx, self.pz + dz
        s.dist = math.sqrt(dx * dx + dz * dz)
        local ahead = dx * fx + dz * fz
        local facing = -(dx * s.nx + dz * s.nz) -- positive when we are in front of it
        s.visible = s.dist < 700 and facing > 0 and (ahead > -s.w or s.dist < 80)
        if s.visible or not s.drawn then
            s.art:advance(dt)
        end
    end
    return true
end

-- ------------------------------------------------------------------ pointer

-- Where a ray from the eye through the pointer lands: which artboard, and
-- where on it (0..1 across, 0..1 down).
local function pick(self: City, position: Vector): (string, number, number, number)
    local w, h = self.size.x, self.size.y
    if w < 2 or h < 2 then
        return '', 0, 0, 0
    end
    local nx0, ny0 = position.x / w * 2 - 1, 1 - position.y / h * 2
    -- the cockpit and the world are drawn through different lenses
    local t = math.tan(cockpitFov(w / h) / 2)
    local dx = nx0 * t * (w / h)
    local dy = ny0 * t
    local dz = -1

    -- the car's own screens first: they are in front of everything
    local speedoPanel, navPanel = self.speedoPanel, self.navPanel
    if speedoPanel == nil or navPanel == nil then
        return '', 0, 0, 0
    end
    local panels: { Panel } = { speedoPanel, navPanel }
    for index, p in ipairs(panels) do
        -- the panel's normal is u x v; solve o + a*u + b*v = k*d for the ray d
        local nx, ny, nz = p.uy * p.vz - p.uz * p.vy, p.uz * p.vx - p.ux * p.vz, p.ux * p.vy - p.uy * p.vx
        local denom = dx * nx + dy * ny + dz * nz
        if math.abs(denom) > 1e-6 then
            local k = (p.ox * nx + p.oy * ny + p.oz * nz) / denom
            if k > 0 then
                local qx, qy, qz = dx * k - p.ox, dy * k - p.oy, dz * k - p.oz
                local a = (qx * p.ux + qy * p.uy + qz * p.uz) / (p.ux * p.ux + p.uy * p.uy + p.uz * p.uz)
                local b = (qx * p.vx + qy * p.vy + qz * p.vz) / (p.vx * p.vx + p.vy * p.vy + p.vz * p.vz)
                if a >= 0 and a <= 1 and b >= 0 and b <= 1 then
                    return 'screen', index, a, b
                end
            end
        end
    end
    -- below the top of the dash there is only car
    if dy < -0.15 then
        return '', 0, 0, 0
    end

    -- then the signs, nearest first
    t = math.tan((FOV + self.boost * math.rad(9)) / 2)
    dx, dy = nx0 * t * (w / h), ny0 * t
    local wxd = self.rx * dx + self.ux * dy + self.fx
    local wyd = self.ry * dx + self.uy * dy + self.fy
    local wzd = self.rz * dx + self.uz * dy + self.fz
    local best, bestK, bestA, bestB = 0, math.huge, 0, 0
    for index, s in ipairs(self.signs) do
        local denom = wxd * s.nx + wzd * s.nz
        if s.visible and denom < -1e-6 then
            local k = ((s.wx - self.px) * s.nx + (s.wz - self.pz) * s.nz) / denom
            if k > 0 and k < bestK then
                local hx, hy, hz = self.px + wxd * k - s.wx, self.py + wyd * k - s.y, self.pz + wzd * k - s.wz
                -- across the sign as the viewer sees it, and down from its top
                local a = (hx * s.nz - hz * s.nx) / s.w + 0.5
                local b = 0.5 - hy / s.h
                if a >= 0 and a <= 1 and b >= 0 and b <= 1 then
                    best, bestK, bestA, bestB = index, k, a, b
                end
            end
        end
    end
    if best > 0 then
        return 'sign', best, bestA, bestB
    end
    return '', 0, 0, 0
end

-- Hands a pointer event to an artboard, in that artboard's own coordinates.
-- phase: 'down', 'up', 'move' or 'exit'.
local function deliver<T>(art: Artboard<T>, phase: string, a: number, b: number, id: number)
    local event = PointerEvent.new(id, Vector.xy(a * art.width, b * art.height))
    if phase == 'down' then
        art:pointerDown(event)
    elseif phase == 'up' then
        art:pointerUp(event)
    elseif phase == 'move' then
        art:pointerMove(event)
    else
        art:pointerExit(event)
    end
end

local function send(self: City, kind: string, index: number, phase: string, a: number, b: number, id: number)
    if kind == 'sign' then
        local s = self.signs[index]
        if s then
            deliver(s.art, phase, a, b, id)
        end
    elseif kind == 'screen' then
        local art = if index == 1 then self.speedoArt else self.navArt
        if art then
            deliver(art, phase, a, b, id)
        end
    end
end

local function countTagged(self: City)
    local n = 0
    for _, s in ipairs(self.signs) do
        if s.art.data.tagged.value then
            n += 1
        end
    end
    self.tagged = n
end

local function hoverTo(self: City, kind: string, index: number, a: number, b: number, id: number)
    if (kind ~= self.hoverKind or index ~= self.hoverIndex) and self.hoverKind ~= '' then
        send(self, self.hoverKind, self.hoverIndex, 'exit', 0, 0, id)
    end
    self.hoverKind, self.hoverIndex = kind, index
    if kind ~= '' then
        send(self, kind, index, 'move', a, b, id)
    end
end

local function pointerDown(self: City, event: PointerEvent)
    local kind, index, a, b = pick(self, event.position)
    if kind ~= '' then
        hoverTo(self, kind, index, a, b, event.id)
        send(self, kind, index, 'down', a, b, event.id)
        self.pressKind, self.pressIndex = kind, index
    else
        -- a press on open sky steers: drag sideways to turn, up and down to climb
        self.dragging = true
        self.dragX, self.dragY = event.position.x, event.position.y
    end
    event:hit()
end

local function pointerMove(self: City, event: PointerEvent)
    if self.dragging then
        self.dragSteer = clamp((event.position.x - self.dragX) / 160, -1, 1)
        self.dragLift = clamp((self.dragY - event.position.y) / 160, -1, 1)
        event:hit()
        return
    end
    local kind, index, a, b = pick(self, event.position)
    hoverTo(self, kind, index, a, b, event.id)
end

local function pointerUp(self: City, event: PointerEvent)
    if self.dragging then
        self.dragging = false
        self.dragSteer, self.dragLift = 0, 0
    elseif self.pressKind ~= '' then
        local kind, index, a, b = pick(self, event.position)
        if kind == self.pressKind and index == self.pressIndex then
            send(self, kind, index, 'up', a, b, event.id)
        else
            send(self, self.pressKind, self.pressIndex, 'exit', 0, 0, event.id)
        end
        self.pressKind, self.pressIndex = '', 0
        countTagged(self)
    end
    event:hit()
end

local function pointerExit(self: City, event: PointerEvent)
    hoverTo(self, '', 0, 0, 0, event.id)
    self.dragging = false
    self.dragSteer, self.dragLift = 0, 0
end

-- ------------------------------------------------------------------ keys and pads

local DRIVE_KEYS: { [number]: boolean } = {
    [87] = true, -- W
    [65] = true, -- A
    [83] = true, -- S
    [68] = true, -- D
    [81] = true, -- Q
    [69] = true, -- E
    [82] = true, -- R
    [70] = true, -- F
    [32] = true, -- space
    [262] = true, -- right
    [263] = true, -- left
    [264] = true, -- down
    [265] = true, -- up
    [266] = true, -- page up
    [267] = true, -- page down
    [340] = true, -- shift
}

local function keyboardEvent(self: City, event: KeyboardEvent): boolean
    if DRIVE_KEYS[event.key] ~= true then
        return false
    end
    self.keys[event.key] = event.phase ~= 'up'
    return true
end

local function dead(v: number): number
    return if math.abs(v) < 0.15 then 0 else v
end

local function gamepadEvent(self: City, event: GamepadEvent)
    self.padSteer = dead(event.leftStick.x)
    self.padThrottle = event.rightTrigger - event.leftTrigger
    self.padLift = -dead(event.rightStick.y)
    self.padBoost = event.south
end

-- ------------------------------------------------------------------ drawing

local function drawArtboard(canvas: Canvas, art: Artboard<any>, clear: Color)
    local r = canvas:beginFrame({ clearColor = clear })
    art:draw(r)
    canvas:endFrame()
end

local function writeQuad(bytes: buffer, ubo: GPUBuffer, mvp: Mat4, brightness: number, fog: number, scan: number, time: number)
    mvp:writeToBuffer(bytes, 0)
    putVec4(bytes, 64, brightness, fog, scan, time)
    putVec4(bytes, 80, 0.24, 0.08, 0.3, 1)
    ubo:write(bytes)
end

local function draw(self: City, renderer: Renderer)
    local gfx = self.gfx
    local speedoArt, navArt, hudArt = self.speedoArt, self.navArt, self.hudArt
    local speedoPanel, navPanel, hudPanel = self.speedoPanel, self.navPanel, self.hudPanel
    if not gfx or not speedoArt or not navArt or not hudArt or not speedoPanel or not navPanel or not hudPanel then
        return
    end

    -- 1. every live artboard into its canvas
    local black = Color.rgba(0, 0, 0, 255)
    drawArtboard(speedoPanel.canvas, speedoArt, black)
    drawArtboard(navPanel.canvas, navArt, black)
    drawArtboard(hudPanel.canvas, hudArt, Color.rgba(0, 0, 0, 0))
    for _, s in ipairs(self.signs) do
        if s.visible or not s.drawn then
            drawArtboard(s.canvas, s.art, black)
            s.drawn = true
        end
    end

    -- 2. this frame's camera
    local aspect = gfx.width / gfx.height
    local fov = FOV + self.boost * math.rad(9)
    local eye = Vector.xyz(self.px, self.py, self.pz)
    local view = Mat4.lookAt(eye, Vector.xyz(self.px + self.fx, self.py + self.fy, self.pz + self.fz), Vector.xyz(self.ux, self.uy, self.uz))
    local viewProj = Mat4.perspective(fov, aspect, 0.5, 1800) * view
    local g = self.globalBytes
    viewProj:writeToBuffer(g, 0)
    putVec4(g, 64, self.px, self.py, self.pz, self.time)
    putVec4(g, 80, self.rx, self.ry, self.rz, 0)
    putVec4(g, 96, self.ux, self.uy, self.uz, 0)
    putVec4(g, 112, self.fx, self.fy, self.fz, math.tan(fov / 2))
    putVec4(g, 128, aspect, CITY, CELL, self.boost)
    gfx.globals:write(g)

    for _, s in ipairs(self.signs) do
        if s.visible then
            -- the sign's right as its viewer sees it, then its top-left corner
            local tx, tz = s.nz, -s.nx
            local model = quadMatrix(s.wx - tx * s.w / 2, s.y + s.h / 2, s.wz - tz * s.w / 2, tx * s.w, 0, tz * s.w, 0, -s.h, 0)
            local f = 1 - math.exp(-s.dist * 0.0028)
            writeQuad(s.bytes, s.ubo, viewProj * model, 1.15, clamp(f * f * 0.8, 0, 0.85), 0.08, self.time)
        end
    end

    -- the cockpit keeps its own lens, so speed does not stretch the dash
    local cockpitProj = Mat4.perspective(cockpitFov(aspect), aspect, 0.05, 20)
    local c = self.cockpitBytes
    cockpitProj:writeToBuffer(c, 0)
    putVec4(c, 64, self.time, self.boost, if self.warning then 1 else 0, 0)
    gfx.cockpitUbo:write(c)
    writeQuad(speedoPanel.bytes, speedoPanel.ubo, cockpitProj * speedoPanel.model, 1.0, 0, 0.06, self.time)
    writeQuad(navPanel.bytes, navPanel.ubo, cockpitProj * navPanel.model, 1.0, 0, 0.06, self.time)
    writeQuad(hudPanel.bytes, hudPanel.ubo, cockpitProj * hudPanel.model, 0.9, 0, 0.1, self.time)

    -- 3. one pass: the world back to front, then the car over it
    local pass = gfx.canvas:beginRenderPass({
        color = { { loadOp = 'clear', storeOp = 'store', clearColor = { 0.02, 0.02, 0.06, 1 } } },
        depthStencil = { view = gfx.depthView, depthLoadOp = 'clear', depthStoreOp = 'discard', depthClearValue = 1 },
    })
    pass:setBindGroup(0, gfx.globalsBind)
    pass:setPipeline(gfx.sky)
    pass:draw(3)
    pass:setPipeline(gfx.ground)
    pass:draw(6)
    pass:setPipeline(gfx.building)
    pass:setVertexBuffer(0, gfx.boxVerts)
    pass:setVertexBuffer(1, gfx.buildingInst)
    pass:draw(36, gfx.buildingCount)
    pass:setPipeline(gfx.traffic)
    pass:setVertexBuffer(1, gfx.trafficInst)
    pass:draw(36, gfx.trafficCount)

    pass:setPipeline(gfx.signPipe)
    pass:setVertexBuffer(0, gfx.quadVerts)
    for _, s in ipairs(self.signs) do
        if s.visible then
            pass:setBindGroup(0, s.bind)
            pass:draw(6)
        end
    end

    pass:setPipeline(gfx.cockpitPipe)
    pass:setBindGroup(0, gfx.cockpitBind)
    pass:setVertexBuffer(0, gfx.cockpitVerts)
    if aspect < 1.2 then
        pass:draw(gfx.cockpitCount - 12, 1, 12) -- no roof: it would cover the sky
    else
        pass:draw(gfx.cockpitCount)
    end

    pass:setPipeline(gfx.screenPipe)
    pass:setVertexBuffer(0, gfx.quadVerts)
    pass:setBindGroup(0, speedoPanel.bind)
    pass:draw(6)
    pass:setBindGroup(0, navPanel.bind)
    pass:draw(6)
    pass:setPipeline(gfx.glassPipe)
    pass:setBindGroup(0, hudPanel.bind)
    pass:draw(6)
    pass:finish()

    -- 4. the finished picture onto the artboard, scaled to the layout
    renderer:save()
    renderer:transform(Mat2D.withScale(self.size.x / gfx.width, self.size.y / gfx.height))
    renderer:drawImage(gfx.canvas.image, ImageSampler('clamp', 'clamp', 'bilinear'), 'srcOver', 1)
    renderer:restore()
end

return function(context: Context): Layout<City>
    return {
        speedo = late(),
        nav = late(),
        hud = late(),
        ad1 = late(),
        ad2 = late(),
        ad3 = late(),
        ad4 = late(),
        ad5 = late(),
        gfx = nil,
        speedoArt = nil,
        navArt = nil,
        hudArt = nil,
        speedoPanel = nil,
        navPanel = nil,
        hudPanel = nil,
        signs = {},
        boxes = {},
        size = Vector.xy(1280, 720),
        pixelScale = 1,
        time = 0,
        px = 8 * CELL,
        py = 28,
        pz = 7.8 * CELL,
        yaw = 0,
        roll = 0,
        pitch = 0,
        speed = 38,
        power = 100,
        boost = 0,
        boosting = false,
        warning = false,
        autopilot = true,
        tagged = 0,
        keys = {},
        padSteer = 0,
        padThrottle = 0,
        padLift = 0,
        padBoost = false,
        dragging = false,
        dragX = 0,
        dragY = 0,
        dragSteer = 0,
        dragLift = 0,
        pressKind = '',
        pressIndex = 0,
        hoverKind = '',
        hoverIndex = 0,
        rx = 1,
        ry = 0,
        rz = 0,
        ux = 0,
        uy = 1,
        uz = 0,
        fx = 0,
        fy = 0,
        fz = -1,
        globalBytes = buffer.create(144),
        cockpitBytes = buffer.create(80),
        init = init,
        resize = resize,
        advance = advance,
        draw = draw,
        pointerDown = pointerDown,
        pointerMove = pointerMove,
        pointerUp = pointerUp,
        pointerExit = pointerExit,
        keyboardEvent = keyboardEvent,
        gamepadEvent = gamepadEvent,
    }
end
