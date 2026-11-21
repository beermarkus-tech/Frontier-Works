'use strict';
/* ================= DATA ================= */
let MW=128, MH=128;   // map size: 128 for maps made before biomes, MAP_NEW for new maps (stored in the save as S.mw)
const MAP_NEW=384, MAP_EXT=32, EARTH_NB=7, TS=24, DX=[1,0,-1,0], DY=[0,1,0,-1], ARW=['→','↓','←','↑'];
const IT={};
function I(id,n,c,f,e){IT[id]={id,n,c,f:!!f,e:e||0};}
I('iron_ore','Iron Ore','#a0614e');I('copper_ore','Copper Ore','#d27a3a');I('limestone','Limestone','#d9cfb0');
I('coal','Coal','#2a2a2a',0,150);I('sulfur','Sulfur','#e6d33a');I('quartz','Raw Quartz','#e9b8e6');
I('bauxite','Bauxite','#b4482a');I('uranium','Uranium Ore','#73e04a');I('crude','Crude Oil','#2e2236',1);I('water','Water','#3d8ee6',1);
I('iron_ingot','Iron Ingot','#a3a9b1');I('copper_ingot','Copper Ingot','#e08d4c');I('steel_ingot','Steel Ingot','#5f6a77');I('alu_ingot','Aluminum Ingot','#dbe3ea');
I('iron_plate','Iron Plate','#c3c9d1');I('iron_rod','Iron Rod','#8a93a3');I('bolts','Bolts','#b0b8c6');I('wire','Wire','#f0a54a');
I('cable','Cable','#3b3b70');I('concrete','Concrete','#b5b5aa');I('copper_sheet','Copper Sheet','#e8955f');I('steel_beam','Steel Beam','#5a6270');
I('steel_pipe','Steel Pipe','#8eb0cf');I('quartz_crystal','Quartz Crystal','#f4a8f0');I('silica','Silica','#f3f3f3');I('alu_casing','Aluminum Casing','#c6d0da');
I('braced_plate','Braced Plate','#7d8fa2');I('truss_frame','Truss Frame','#5878a6');I('rotor','Rotor','#8f6c48');I('cased_girder','Cased Girder','#a39a86');
I('stator','Stator','#6e5c92');I('motor','Motor','#466c92');I('circuit_board','Circuit Board','#3da35f');I('resonator','Resonator','#c27ee6');
I('alloy_panel','Alloy Panel','#a9c6e6');I('heat_sink','Heat Sink','#e6704f');I('plastic','Plastic','#46d3d3');I('rubber','Rubber','#505050');
I('petro_coke','Petroleum Coke','#3d3333',0,180);I('polymer_resin','Polymer Resin','#d6a83e');I('heavy_residue','Heavy Residue','#7a3a7a',1);
I('fuel','Fuel','#f0a91e',1,750);I('alumina','Alumina Solution','#bcd8ec',1);I('acid','Sulfuric Acid','#d6f03c',1);I('alu_scrap','Aluminum Scrap','#9ea8b2');
I('heavy_truss','Heavy Truss','#34466a');I('compute_module','Compute Module','#22804a');I('data_bus','Data Bus','#46c48a');I('coolant_block','Coolant Block','#5ec6f0');
I('battery','Battery','#a6e64e');I('control_chip','Control Chip','#3ea2f5');I('turbine_core','Turbine Core','#d9622e');I('uranium_cell','Uranium Cell','#4ec43a');
I('fuel_rod','Fuel Rod','#2ef070',0,750000);I('waste','Nuclear Waste','#b4ff3a');I('quantum_core','Quantum Core','#ff5fc8');
/* Colony rocket parts (Session 51; unlocked by Tier 10 since Session 57) */
I('helium','Helium Crystals','#8fe6ff',0,3000);   /* also fusion fuel: 3000 MJ each (Session 60d) */I('regolith','Regolith','#a3a3aa');I('cryo_ice','Cryo Ice','#9fd8ff');I('rare_gas','Rare Gas','#c9a6ff',1);I('sc_coil','Superconductor Coil','#7fe0ff');I('rations','Rations','#9bd46a');I('steam','Steam','#e9eef2',1);I('sphere_panel','Sphere Panel','#ffcf5a');   /* Rime (Session 63) */I('sphere_frame','Sphere Frame Segment','#ffd27a');I('oxygen','Oxygen','#bfe6ff',1);I('ice','Ice','#d4f1ff');I('vac_wafer','Vacuum Wafer','#b9c8ff');I('lattice','Lattice Crystal','#7fffe0');   /* Moon (Session 52) */
I('hull_plate','Hull Plate','#c9d3dd');I('heat_shield','Heat Shield','#5a4a44');I('guidance_core','Guidance Core','#f0c34a');I('rocket_fuel','Rocket Fuel','#ff7a2e');

const RC={}, RL=[];
function pr(s){const o={};s.split(',').forEach(p=>{const [k,v]=p.split(':');o[k.trim()]=+v;});return o;}
function R(id,n,m,t,i,o,alt){const r={id,n,m,t,i:pr(i),o:pr(o),alt:!!alt};RC[id]=r;RL.push(r);}
// Smelter
/* Stack sizes (Session 39m): a machine holds one stack of each input (or one cycle's worth if a recipe needs more). Cheap, common items stack
   high, complex parts low; fluids in m³. */
const STACK={};{const st=(n,ids)=>ids.split(' ').forEach(i=>STACK[i]=n);
 st(200,'bolts wire');
 st(100,'iron_ore copper_ore limestone coal sulfur quartz bauxite uranium iron_ingot copper_ingot steel_ingot alu_ingot iron_plate iron_rod cable concrete copper_sheet silica petro_coke polymer_resin alu_scrap plastic rubber');
 st(100,'water crude heavy_residue fuel alumina acid');
 st(50,'steel_beam steel_pipe quartz_crystal alu_casing braced_plate truss_frame rotor cased_girder stator circuit_board alloy_panel heat_sink battery uranium_cell waste');
 st(20,'motor resonator heavy_truss compute_module data_bus coolant_block control_chip turbine_core fuel_rod');
 st(10,'quantum_core guidance_core');st(100,'helium regolith ice cryo_ice');st(20,'sphere_frame sphere_panel sc_coil');st(50,'rations');st(50,'vac_wafer');st(20,'lattice');st(50,'hull_plate rocket_fuel');st(20,'heat_shield');}
const stackOf=id=>STACK[id]||(IT[id]&&IT[id].f?100:50);
R('r_iron_ingot','Iron Ingot','smelter',2,'iron_ore:1','iron_ingot:1');
R('r_copper_ingot','Copper Ingot','smelter',2,'copper_ore:1','copper_ingot:1');
R('r_pure_alu','Pure Aluminum (alt)','smelter',2,'alu_scrap:2','alu_ingot:1',1);
// Foundry
R('r_steel_ingot','Steel Ingot','foundry',4,'iron_ore:3,coal:3','steel_ingot:3');
R('r_alu_ingot','Aluminum Ingot','foundry',4,'alu_scrap:5,silica:3','alu_ingot:3');
R('r_iron_alloy','Iron Alloy (alt)','foundry',6,'iron_ore:2,copper_ore:2','iron_ingot:5',1);
R('r_coke_steel','Coke Steel (alt)','foundry',12,'iron_ore:15,petro_coke:15','steel_ingot:20',1);
// Press
R('r_iron_plate','Iron Plate','press',6,'iron_ingot:3','iron_plate:2');
R('r_iron_rod','Iron Rod','press',4,'iron_ingot:1','iron_rod:1');
R('r_bolts','Bolts','press',6,'iron_rod:1','bolts:4');
R('r_wire','Wire','press',4,'copper_ingot:1','wire:2');
R('r_cable','Cable','press',2,'wire:2','cable:1');
R('r_concrete','Concrete','press',4,'limestone:3','concrete:1');
R('r_copper_sheet','Copper Sheet','press',6,'copper_ingot:2','copper_sheet:1');
R('r_steel_beam','Steel Beam','press',4,'steel_ingot:4','steel_beam:1');
R('r_steel_pipe','Steel Pipe','press',6,'steel_ingot:3','steel_pipe:2');
R('r_quartz_crystal','Quartz Crystal','press',8,'quartz:5','quartz_crystal:3');
R('r_silica','Silica','press',8,'quartz:3','silica:5');
R('r_alu_casing','Aluminum Casing','press',2,'alu_ingot:3','alu_casing:2');
R('r_cast_bolts','Cast Bolts (alt)','press',24,'iron_ingot:5','bolts:20',1);
R('r_steel_rod','Steel Rod (alt)','press',5,'steel_ingot:1','iron_rod:4',1);
R('r_iron_wire','Iron Wire (alt)','press',24,'iron_ingot:5','wire:9',1);
// Assembler
R('r_braced_plate','Braced Plate','assembler',12,'iron_plate:6,bolts:12','braced_plate:1');
R('r_stitched_plate','Stitched Plate (alt)','assembler',32,'iron_plate:10,wire:20','braced_plate:3',1);
R('r_truss_frame','Truss Frame','assembler',60,'braced_plate:3,iron_rod:12','truss_frame:2');
R('r_rotor','Rotor','assembler',15,'iron_rod:5,bolts:25','rotor:1');
R('r_steel_rotor','Steel Rotor (alt)','assembler',15,'steel_pipe:2,wire:6','rotor:1',1);
R('r_cased_girder','Cased Girder','assembler',10,'steel_beam:1,concrete:6','cased_girder:1');
R('r_stator','Stator','assembler',12,'steel_pipe:3,wire:8','stator:1');
R('r_motor','Motor','assembler',12,'rotor:2,stator:2','motor:1');
R('r_circuit_board','Circuit Board','assembler',8,'copper_sheet:2,plastic:4','circuit_board:1');
R('r_resonator','Resonator','assembler',12,'quartz_crystal:3,rubber:2','resonator:1');
R('r_alloy_panel','Alloy Panel','assembler',6,'alu_ingot:3,copper_ingot:1','alloy_panel:4');
R('r_heat_sink','Heat Sink','assembler',8,'alloy_panel:5,copper_sheet:3','heat_sink:1');
R('r_hull_plate','Hull Plate','assembler',12,'alloy_panel:6,steel_beam:2','hull_plate:1');
R('r_insulated_cable','Insulated Cable (alt)','assembler',12,'wire:9,rubber:6','cable:20',1);
// Refinery
R('r_plastic','Plastic','refinery',6,'crude:3','plastic:2,heavy_residue:1');
R('r_rubber','Rubber','refinery',6,'crude:3','rubber:2,heavy_residue:2');
R('r_fuel','Fuel','refinery',6,'crude:6','fuel:4,polymer_resin:3');
R('r_residual_fuel','Residual Fuel','refinery',6,'heavy_residue:6','fuel:4');
R('r_petro_coke','Petroleum Coke','refinery',6,'heavy_residue:4','petro_coke:12');
R('r_residual_plastic','Residual Plastic','refinery',6,'polymer_resin:6,water:2','plastic:2');
R('r_residual_rubber','Residual Rubber','refinery',6,'polymer_resin:4,water:4','rubber:2');
R('r_wet_concrete','Wet Concrete (alt)','refinery',3,'limestone:6,water:5','concrete:4',1);
R('r_alumina','Alumina Solution','refinery',6,'bauxite:12,water:18','alumina:12,silica:5');
R('r_wet_alumina','Wet Alumina (alt)','refinery',6,'bauxite:10,water:10','alumina:12',1);   /* no silica byproduct (Session 39af, Markus) */
R('r_alu_scrap','Aluminum Scrap','refinery',4,'alumina:4,petro_coke:2','alu_scrap:6,water:2');
R('r_acid','Sulfuric Acid','refinery',6,'sulfur:5,water:5','acid:5');
// Fabricator
R('r_heavy_truss','Heavy Truss','fabricator',30,'truss_frame:5,steel_pipe:15,cased_girder:5,bolts:100','heavy_truss:1');
R('r_compute_module','Compute Module','fabricator',24,'circuit_board:10,cable:9,plastic:18,bolts:52','compute_module:1');
R('r_data_bus','Data Bus','fabricator',16,'wire:50,cable:10,circuit_board:1','data_bus:1');
R('r_control_chip','Control Chip','fabricator',32,'compute_module:2,data_bus:3,resonator:2,plastic:28','control_chip:1');
R('r_turbine_core','Turbine Core','fabricator',32,'motor:4,coolant_block:3,data_bus:2,rubber:24','turbine_core:1');
R('r_fuel_rod','Fuel Rod','fabricator',150,'uranium_cell:50,cased_girder:3,steel_beam:6','fuel_rod:1');
R('r_guidance_core','Guidance Core','fabricator',30,'quantum_core:1,control_chip:1','guidance_core:1');   /* the Quantum Core is the heart of the ship (Session 57) */
// Vacuum Furnace (Moon only, Session 52): things that can only be made in vacuum and low gravity
R('r_vac_wafer','Vacuum Wafer','vfurnace',12,'silica:6,helium:2','vac_wafer:2');
R('r_lattice','Lattice Crystal','vfurnace',16,'quartz_crystal:4,helium:4','lattice:1');
// Moon base goals (Session 58, DESIGN.md section 12): local concrete, water, circuit boards and aluminium
R('r_sinter','Sintered Blocks','vfurnace',4,'regolith:4','concrete:1');   /* regolith baked into blocks that count as concrete: no water, more power */
R('r_lunarcrete','Moon Concrete','vfurnace',4,'regolith:3,water:4','concrete:2');
// Moon colony (Session 60): steel from regolith, oxygen for habitats
R('r_vac_steel','Lunar Steel','vfurnace',8,'iron_ore:4,regolith:2','steel_ingot:2');   /* carbon traces in the regolith; slow and power-hungry */
R('r_o2_regolith','Regolith Oxygen','vfurnace',6,'regolith:6','oxygen:3,iron_ore:1');
R('r_o2_water','Water Splitting','refinery',4,'water:4','oxygen:3');
// Earth upgrades with Moon goods (Session 60b, unlocked with Moon goal 6)
R('r_cryo_rod','Cryo Fuel Rod (alt)','fabricator',90,'uranium_cell:30,helium:10,cased_girder:3','fuel_rod:1',1);
R('r_lattice_qc','Lattice Quantum Core (alt)','fabricator',40,'control_chip:1,compute_module:2,lattice:2','quantum_core:1',1);
// Dyson Sphere stage 1 (Session 62): frame segments made on Earth from Moon lattice crystals
R('r_sphere_frame','Sphere Frame Segment','fabricator',40,'lattice:2,hull_plate:2,heat_sink:4,steel_beam:6','sphere_frame:1');
// Rime (Session 64, DESIGN.md section 15): the Cryo Plant works with deep cold; no coal on Rime, so steel is quenched in cryo ice
R('r_thaw','Thawed Water','cryoplant',2,'cryo_ice:2','water:4');
R('r_frost_steel','Frost Steel','cryoplant',6,'iron_ore:3,cryo_ice:2','steel_ingot:3');
R('r_cryo_o2','Frozen Air','cryoplant',4,'cryo_ice:2','oxygen:3');   /* Session 65d: cryo ice holds frozen air; Rime's first oxygen (45 m³/min per plant) */
R('r_sc_coil','Superconductor Coil','cryoplant',15,'wire:20,cryo_ice:4,rare_gas:10','sc_coil:1');
R('r_coil_motor','Coil Motor (alt)','fabricator',20,'sc_coil:1,steel_beam:2,wire:10','motor:2',1);
// Colony food (Session 65): plants also make oxygen
R('r_hydro','Rations (Hydroponics)','hydro',12,'water:6,regolith:1','rations:2,oxygen:2');
R('r_hothouse','Rations (Hothouse)','hothouse',12,'water:6,steam:4','rations:2,oxygen:2');
RC.r_hydro.vent=RC.r_hothouse.vent='oxygen';   /* Session 65c: the oxygen is a bonus; without a pipe for it, it's released and the farm keeps growing */
// Dyson Sphere stage 2 (Session 64): panels made on Earth from Rime coils and Moon wafers
R('r_sphere_panel','Sphere Panel','fabricator',40,'sc_coil:2,vac_wafer:4,alloy_panel:4','sphere_panel:1');
R('r_wafer_cb','Wafer Circuit Board','vfurnace',8,'vac_wafer:1,copper_sheet:2','circuit_board:2');
R('r_moon_alu','Lunar Aluminum','vfurnace',6,'bauxite:4,water:6','alu_ingot:2');
R('r_quantum_core','Quantum Core','fabricator',60,'control_chip:2,compute_module:3,heat_sink:6,battery:10','quantum_core:1');
// Blender
R('r_uranium_cell','Uranium Cell','blender',12,'uranium:10,concrete:3,acid:8','uranium_cell:5,acid:2');
R('r_battery','Battery','blender',6,'acid:5,alumina:4,alu_casing:2','battery:2,water:3');
R('r_heat_shield','Heat Shield','blender',16,'heat_sink:2,silica:12,acid:6','heat_shield:1');
R('r_rocket_fuel','Rocket Fuel','blender',6,'fuel:10,alu_casing:1','rocket_fuel:2');
R('r_coolant_block','Coolant Block','blender',10,'heat_sink:2,rubber:2,water:10','coolant_block:1');

const B={};
function D(id,o){o.id=id;o.w=o.w||1;o.cost=o.cost||{};B[id]=o;}
D('core',{n:'Base Core',sn:'CORE',k:'core',w:4,col:'#b8862a',desc:'Delivers anything belted in to your item stock.'});
D('belt1',{n:'Conveyor Mk1',k:'belt',spd:1,cat:'log',col:'#9aa0a8',cost:{iron_plate:1},ow:1,desc:'60 items/min. Drag to lay a line.'});
D('belt2',{n:'Conveyor Mk2',k:'belt',spd:2,cat:'log',col:'#e0c040',cost:{iron_plate:1,bolts:6},ow:1,desc:'120 items/min. Draw over old belts to upgrade.'});
D('belt3',{n:'Conveyor Mk3',k:'belt',spd:4.5,cat:'log',col:'#ee7a30',cost:{steel_beam:1},ow:1,desc:'270 items/min'});
D('belt4',{n:'Conveyor Mk4',k:'belt',spd:8,cat:'log',col:'#40b8ee',cost:{steel_pipe:1,plastic:1},ow:1,desc:'480 items/min'});
D('belt5',{n:'Conveyor Mk5',k:'belt',spd:13,cat:'log',col:'#c25cf0',cost:{alloy_panel:1,plastic:1},ow:1,desc:'780 items/min'});
D('pipe1',{n:'Pipeline Mk1',k:'pipe',spd:5,cat:'fluid',col:'#6f93b8',cost:{copper_sheet:1},ow:1,desc:'300 m³/min of fluid. No flow direction. Pipes join only end to end along the line you draw; side by side they stay apart. Use a Pipe Junction to join or branch pipes and to connect buildings.'});
D('pipe2',{n:'Pipeline Mk2',k:'pipe',spd:10,cat:'fluid',col:'#d6a640',cost:{copper_sheet:1,plastic:1},ow:1,desc:'600 m³/min of fluid. No flow direction. Pipes join only end to end along the line you draw; side by side they stay apart. Use a Pipe Junction to join or branch pipes and to connect buildings.'});
D('splitter',{n:'Splitter',k:'router',sub:'split',cat:'log',col:'#d08a2a',cost:{iron_plate:2,cable:2},ow:1,desc:'Input from the back, splits to front/left/right. Outputs go into belts or straight into a building touching that side.'});
D('merger',{n:'Merger',k:'router',sub:'merge',cat:'log',col:'#2a9ad0',cost:{iron_plate:2,cable:2},ow:1,desc:'Inputs from back/left/right (belts, or a machine touching that side), outputs to the front (belt or building).'});
D('lsplit',{n:'Logic Splitter',k:'router',sub:'logic',cat:'log',col:'#2fa8a0',cost:{braced_plate:2,cable:10},ow:1,desc:'A splitter with rules for each output (left, front, right): specific items, Any, Any other, Overflow, or Blocked. Tap it to set the rules.'});
D('crossing',{n:'Crossing',k:'cross',cat:'log',col:'#6c6c6c',cost:{iron_plate:3,bolts:6},ow:1,desc:'Lets two belts/pipes cross each other.'});
D('fmeter',{n:'Flow Meter',k:'fmeter',cat:'log',col:'#e8eef2',cost:{iron_plate:2,wire:4},ow:1,desc:'Clip it onto a belt or pipe to show how much flows there per minute. Tap the same tile again to take it off.'});
D('junction',{n:'Pipe Junction',k:'router',sub:'junc',fl:1,cat:'fluid',col:'#4a7aa8',cost:{copper_sheet:4},ow:1,desc:'The entry point between pipes and a building: connects all four sides, to pipes and to every building it touches.'});
D('valve',{n:'Flow Valve',k:'router',sub:'valve',fl:1,cat:'fluid',col:'#3f9ad0',cost:{copper_sheet:6,rotor:1},ow:1,desc:'Lets fluid through one way only (arrow), up to a limit you set: e.g. top up a loop with outside water only as much as it lacks. Put it between two pipes.'});
D('soutlet',{n:'Stock Outlet',k:'soutlet',w:2,cat:'log',col:'#e8b04a',cost:{iron_plate:10,cable:10},desc:'Feeds one chosen item from this world\u2019s item stock (what reached the Base Core, or arrived by freighter) onto belts leading away, as fast as they take it. Tap it to choose the item.'});   /* Session 62c */
D('storage',{n:'Storage Crate',k:'storage',w:2,cap:2000,cat:'log',col:'#7a6040',cost:{iron_plate:10,iron_rod:10},desc:'Buffers 2000 items; passes them on to outgoing belts.'});
D('tank',{n:'Fluid Tank',k:'tank',w:2,cap:400,cat:'fluid',col:'#3a6a90',cost:{copper_sheet:20,braced_plate:4},desc:'Buffers 400 m³ of one fluid.'});
/* Trains (Session 56, DESIGN.md section 13): one-way track pieces (k 'rail'), Cargo Bays, trains built from a Train Stop */
D('rail',{n:'Rail',k:'rail',cat:'trans',col:'#8f8576',cost:{iron_rod:2,iron_plate:1},desc:'One-way train track: drag to lay it, the arrow is the driving direction. Turns become curves. Trains can join a track from the side; use a Rail Switch to split one.'});
D('rswitch',{n:'Rail Switch',k:'rail',sub:'switch',cat:'trans',col:'#d0a040',cost:{iron_plate:4,iron_rod:4,cable:2},desc:'Splits a track (straight on, or onto the short branch at its side) or joins a side track into it. Place it on a track and it lines up by itself; Rotate cycles: split right, split left, join from right, join from left. Each train picks the way to its next stop.'});
D('tstop',{n:'Train Stop',k:'rail',sub:'stop',cat:'trans',col:'#e05a3a',cost:{iron_plate:10,cable:5},desc:'A named track piece where trains halt (the locomotive stops on it, the wagons line up behind). Build trains from its panel. Put Cargo Bays beside the track behind it: 2 tiles per wagon.'});
D('cbay',{n:'Cargo Bay',k:'cbay',w:2,pw:5,cap:800,cat:'trans',col:'#6f8a52',cost:{iron_plate:20,iron_rod:20,cable:10},desc:'Beside a track behind a Train Stop: loads the wagon next to it (Load: belts fill the bay) or unloads it (Unload: belts carry it away). Holds 800 items. Needs power.'});
const TRAIN={cap:1000,vmax:16,acc:2.5,brk:4,pw:15,crawl:1.5,xfer:40,car:2,maxW:4,loco:{motor:4,circuit_board:4,steel_beam:10,iron_plate:20},wagon:{steel_beam:4,iron_plate:20,bolts:20}};
/* Moon Rovers (Session 59): a depot sends ground rovers to another depot; they drive around buildings and crater rims */
D('rdepot',{n:'Rover Depot',k:'rdepot',w:3,pw:10,cap:600,only:'moon',cat:'trans',col:'#d8dde2',cost:{iron_plate:30,copper_sheet:20,wire:30,concrete:10},desc:'Holds 600 items. Link it to another depot and its rovers drive the goods there (200 per trip), around buildings, belts and pipes (over crater rims slowly, if needed), then come back. Comes with one rover; add up to 3. Recharges rovers (needs power). Only on the Moon.'});
D('tdepot',{n:'Tanker Depot',k:'tdepot',w:3,pw:10,cap:1200,fl:1,only:'moon',cat:'trans',col:'#cfe3f0',cost:{iron_plate:30,copper_sheet:40,wire:30,concrete:10},desc:'The fluid version of the Rover Depot: holds 1200 m³ of one fluid. Linked to another Tanker Depot, it takes fluid from a pipe (through a Pipe Junction) and its tanker rovers carry 400 m³ per trip; an unlinked one feeds what arrives into its pipes. Only on the Moon.'});
/* Orbital Freighters (Session 60b): ports on both worlds; freighters (based at Home, fuelled with Rocket Fuel there) move item stock between worlds */
D('fport',{n:'Freighter Port',k:'fport',w:6,pw:40,cat:'trans',col:'#b8c4d0',cost:{steel_beam:60,alloy_panel:40,concrete:100,circuit_board:20},   /* Session 62b: no hull plates, it's ground infrastructure */desc:'Landing site for Orbital Freighters (one is needed on each world). A Home port builds freighters and sets their routes: cargo taken from one world\u2019s item stock and delivered into the other\u2019s, both ways. Each round trip burns Rocket Fuel from Home\u2019s stock. Needs power to launch.'});
/* Dyson Sphere (Session 62, DESIGN.md section 12): a Sphere Launcher on Home fires frame segments into orbit around the sun; finished stages beam power back */
D('slaunch',{n:'Sphere Launcher',k:'slaunch',w:8,pw:4000,only:'home',cat:'trans',col:'#ffb547',cost:{heavy_truss:40,motor:80,control_chip:30,cased_girder:150,concrete:600,lattice:30},desc:'A magnetic launcher that fires Sphere Frame Segments into orbit around the sun (one every 20 s). Belt the segments in. Draws 4000 MW while charging. Home only.'});
D('srecv',{n:'Sphere Receiver',k:'gen',w:4,cap:2500,fuels:[],solar:1,only:'home',link:10,sup:7,cat:'pow',col:'#ffd27a',cost:{alloy_panel:60,control_chip:10,heat_sink:20,steel_beam:30},desc:'Receives power beamed down from the finished Dyson Sphere frame: 2500 MW, no fuel. Home only.'});
/* it = item the launchers fire in this stage; cap = Sphere Receiver output once the stage is complete (Session 64) */
const DYSON={fire:20,store:20,stages:[{n:'Sphere Frame',need:300,it:'sphere_frame',cap:2500,b:['srecv'],why:'Launch the frame: a ring of segments around the sun. Finished, it beams power back to Home Sphere Receivers.'},
 {n:'Sphere Panels',need:300,it:'sphere_panel',cap:6000,b:[],why:'Clad the frame with panels (Superconductor Coils from Rime, Vacuum Wafers from the Moon). Finished, every Sphere Receiver gives 6000 MW.'},
 {n:'Sphere Shell',need:0,soon:'The last chapter: still to come.'}]};
const FREIGHT={cap:2000,fly:60,flyTo:{moon:60,rime:120},dock:5,fuel:40,max:3,cost:{hull_plate:20,guidance_core:1,rocket_fuel:40}};
D('geoturb',{n:'Geyser Turbine',k:'gen',w:3,cap:200,fuels:[],solar:1,geyser:1,only:'rime',link:8,sup:5,cat:'pow',col:'#bfe3f7',cost:{iron_plate:40,copper_sheet:30,cable:30,concrete:20},desc:'Sits on a steam geyser: 200 MW, no fuel. Only on Rime.'});
D('sdepot',{n:'Sled Depot',k:'rdepot',veh:'sled',w:3,pw:10,cap:450,only:'rime',cat:'trans',col:'#d6e8f5',cost:{iron_plate:30,copper_sheet:20,wire:30,concrete:10},desc:'Ice Sleds: link it to another Sled Depot; its sleds race the goods there (150 per trip), fastest over frozen seas, around buildings and glacier cliffs. Comes with one sled, up to 3. Needs power. Only on Rime.'});
D('stdepot',{n:'Tanker Sled Depot',k:'tdepot',veh:'sled',fl:1,w:3,pw:10,cap:900,only:'rime',cat:'trans',col:'#cfe3f0',cost:{iron_plate:30,copper_sheet:40,wire:30,concrete:10},desc:'Fluid version of the Sled Depot: holds 900 m³ of one fluid; tanker sleds carry 300 m³ per trip. Fills from (linked) or feeds into (unlinked) its pipes through a Pipe Junction. Only on Rime.'});
D('gasx',{n:'Gas Extractor',k:'pump',w:2,rate:1,pw:25,gas:1,only:'rime',cat:'ext',col:'#b89ae8',cost:{iron_plate:20,copper_sheet:20,steel_pipe:10},desc:'Sits on a steam geyser and catches the Rare Gas in its plume: 60 m³/min on a normal geyser (out through a Pipe Junction). Only on Rime.'});
D('cryoplant',{n:'Cryo Plant',k:'mach',mt:'cryoplant',w:3,pw:40,crew:2,only:'rime',cat:'prod',col:'#8fd0f0',cost:{iron_plate:40,copper_sheet:30,cable:30,concrete:40},desc:'Uses Rime\u2019s deep cold: thaws cryo ice into water, releases its frozen air as oxygen, quenches Frost Steel from iron ore (no coal needed) and winds Superconductor Coils. Up to 3 inputs, solids and fluids. Needs 2 crew. Only on Rime.'});
const SLED={cap:150,fcap:300,spd:9,load:2,unload:2,wait:10,max:3,cost:{iron_plate:20,copper_sheet:10,wire:20}};
const ROVER={fcap:400,cap:200,spd:6,load:2,unload:2,wait:10,max:3,cost:{iron_plate:20,copper_sheet:10,wire:20}};
D('lpad',{n:'Launch Pad',k:'lpad',w:6,pw:150,only:'home',cat:'trans',col:'#e8a23a',cost:{heavy_truss:20,cased_girder:60,concrete:400,control_chip:10},desc:'Builds and launches the colony rocket to the Moon. Belt in the rocket parts and the starter kit (or load them from your stock), then press Launch. Needs 150 MW while the rocket is ready.'});
/* Colony rocket (Session 51, DESIGN.md section 12): parts + the starter kit it carries to the Moon (Moon has no coal or limestone) */
const ROCKET={parts:{hull_plate:30,heat_shield:15,guidance_core:2,rocket_fuel:60},kit:{iron_plate:200,iron_rod:40,wire:200,cable:50,concrete:120,braced_plate:16,rotor:8,alloy_panel:24,circuit_board:12},lt:10,to:'moon'};
/* destinations (Session 63): Rime is further away (more fuel), its kit builds Geyser Turbines and a first sled line; open after Moon goal 5 (was 6 before Session 65b) */
const ROCKET_TO={moon:{parts:ROCKET.parts,kit:ROCKET.kit},rime:{parts:{hull_plate:30,heat_shield:15,guidance_core:2,rocket_fuel:200},kit:{iron_plate:300,iron_rod:60,wire:200,cable:80,copper_sheet:80,concrete:120,braced_plate:16,rotor:8},need:{moon:5}}};   /* Session 65b: Moon goal 5 (Self-Sufficient) unlocks the Rime gear; a world already visited stays open */
const rocketDest=e=>(e&&e.dest&&ROCKET_TO[e.dest])?e.dest:'moon';
const rocketNeed=e=>{const D0=ROCKET_TO[rocketDest(e)],o=Object.assign({},D0.parts);for(const k in D0.kit)o[k]=(o[k]||0)+D0.kit[k];return o;};
D('dpad',{n:'Drone Pad',k:'dpad',w:3,pw:25,cap:400,cat:'trans',col:'#2fa7a0',cost:{motor:4,stator:4,cased_girder:6,cable:30},desc:'Holds 400 items. Link it to another pad and its drone flies them there (40 per trip). An unlinked pad receives drones and passes items to outgoing belts.'});
const DRONE={cap:40,spd:10,load:1.5,unload:1.5,wait:8};   // items per trip, tiles per second, seconds to load / unload, max seconds to wait for a full load
D('sign1',{n:'Sign S',k:'sign',w:1,cat:'sign',col:'#e9e2cf',ow:1,cost:{iron_plate:1},desc:'A 1×1 label. Tap it to write text and pick a colour.'});
D('sign2',{n:'Sign M',k:'sign',w:2,cat:'sign',col:'#e9e2cf',ow:1,cost:{iron_plate:2},desc:'A 2×2 label for a factory or line. Tap it to write text and pick a colour.'});
D('sign3',{n:'Sign L',k:'sign',w:3,cat:'sign',col:'#e9e2cf',ow:1,cost:{iron_plate:4},desc:'A 3×3 label, readable from further out.'});
D('sign4',{n:'Sign XL',k:'sign',w:4,cat:'sign',col:'#e9e2cf',ow:1,cost:{iron_plate:6},desc:'A 4×4 label for whole areas, readable from far out.'});
D('sign5',{n:'Sign XXL',k:'sign',w:6,cat:'sign',col:'#e9e2cf',ow:1,cost:{iron_plate:9},desc:'A 6×6 label for a whole district, readable even at the farthest zoom.'});
const SIGNS=['sign1','sign2','sign3','sign4','sign5'];
D('zone',{n:'Factory Zone',k:'zonetool',cat:'sign',col:'#ffb547',cost:{},ow:1,desc:'Drag over the map to mark one factory’s area. Touching an existing zone makes it bigger. Belts and pipes pass through the fence.'});
D('bpstation',{n:'Blueprint Station 12×12',k:'bpst',w:12,pw:2,cat:'bp',col:'#1f5a96',cost:{iron_plate:20,wire:20},desc:'A 12×12 design table (needs power). Place buildings and belts inside it as free design pieces, set their recipes and rules, then save the design as a blueprint and build it anywhere.'});
D('bplist',{n:'Blueprint List',k:'bplisttool',cat:'bp',col:'#8fc6ff',cost:{},ow:1,desc:'Your saved blueprints: build one anywhere, or delete it. New ones are designed in a Blueprint Station.'});
const SIGN_COL=['#e9e2cf','#ffd34a','#4fc3a1','#6fa8ff','#ff7a6a','#b48cff'];   // board colours to pick from
D('drill1',{n:'Drill Mk1',k:'drill',w:2,rate:1,pw:5,cat:'ext',col:'#6b7f3a',cost:{iron_plate:10,concrete:10},desc:'Place over an ore node. 60/min on a normal node.'});
D('drill2',{n:'Drill Mk2',k:'drill',w:2,rate:2,pw:12,cat:'ext',col:'#8a9a2a',cost:{braced_plate:8,truss_frame:2,concrete:20},desc:'120/min on a normal node.'});
D('drill3',{n:'Drill Mk3',k:'drill',w:2,rate:4,pw:30,cat:'ext',col:'#b0b020',cost:{steel_pipe:20,motor:5,circuit_board:5},desc:'240/min on a normal node.'});
D('wpump',{n:'Water Pump',k:'pump',w:2,rate:2,pw:20,water:1,cat:'ext',col:'#2d6fb0',cost:{copper_sheet:10,braced_plate:4,rotor:4},desc:'Must sit fully on water. 120 m³/min.'});
D('opump',{n:'Oil Pump',k:'pump',w:2,rate:2,pw:40,oil:1,cat:'ext',col:'#4a3a5a',cost:{motor:10,cased_girder:10,steel_pipe:20},desc:'Place on an oil well. 120 m³/min on a normal well.'});
D('smelter',{n:'Smelter',k:'mach',mt:'smelter',w:2,pw:4,cat:'prod',col:'#b0502a',cost:{iron_rod:5,wire:8},desc:'Ore → ingots. 1 input.'});
D('press',{n:'Press',k:'mach',mt:'press',w:2,pw:4,cat:'prod',col:'#5a6a7a',cost:{iron_plate:6,cable:6},desc:'Shapes one input into parts.'});
D('assembler',{n:'Assembler',k:'mach',mt:'assembler',w:3,pw:15,cat:'prod',col:'#3a7a6a',cost:{braced_plate:8,rotor:4,cable:10},desc:'Combines 2 inputs.'});
D('foundry',{n:'Foundry',k:'mach',mt:'foundry',w:3,pw:16,cat:'prod',col:'#8a3a2a',cost:{truss_frame:5,rotor:10,concrete:20},desc:'Smelts 2 ingredients into alloys.'});
D('refinery',{n:'Refinery',k:'mach',mt:'refinery',w:3,pw:30,cat:'prod',col:'#5a4a7a',cost:{motor:10,cased_girder:10,steel_pipe:30,copper_sheet:20},desc:'Processes fluids. Solid outputs go to belts, fluids to pipes.'});
D('fabricator',{n:'Fabricator',k:'mach',mt:'fabricator',w:4,pw:55,cat:'prod',col:'#2a5a8a',cost:{motor:5,truss_frame:10,cable:50,cased_girder:10},desc:'Combines up to 4 inputs into complex parts.'});
D('blender',{n:'Blender',k:'mach',mt:'blender',w:3,pw:75,cat:'prod',col:'#2a8a7a',cost:{motor:20,heavy_truss:5,compute_module:5,concrete:50},desc:'Mixes solids and fluids.'});
D('vfurnace',{n:'Vacuum Furnace',k:'mach',mt:'vfurnace',w:3,pw:20,crew:2,only:'moon',cat:'prod',col:'#5b6fd6',cost:{iron_plate:30,copper_sheet:20,quartz_crystal:10,cable:20},desc:'Melts and grows crystals in the Moon\u2019s vacuum, with Helium Crystals. Needs 2 crew (colonists or lander crew). Only works on the Moon. Built from things the Moon can make.'});
D('rexc',{n:'Regolith Excavator',k:'drill',w:2,rate:1,pw:8,reg:1,only:'moon',cat:'ext',col:'#8c8f96',cost:{iron_plate:12,iron_rod:8,copper_sheet:4},desc:'Digs Regolith (loose Moon soil) anywhere: no ore node needed. 60/min. Only on the Moon.'});
D('imelt',{n:'Ice Melter',k:'pump',w:2,rate:2,pw:10,ice:1,only:'moon',cat:'ext',col:'#4f9fd0',cost:{iron_plate:10,copper_sheet:10,wire:10},desc:'Sits on an ice deposit in a dark crater and melts it into Water: 120 m³/min on a normal deposit (out through a Pipe Junction). Only on the Moon.'});   /* Session 58f: a pump on ice nodes, not a free-standing machine */
D('habitat',{n:'Habitat',k:'hab',w:4,pw:15,only:['moon','rime'],cat:'prod',col:'#e9edf1',cost:{steel_beam:10,concrete:40,copper_sheet:20,wire:30},desc:'Home for up to 10 colonists. Needs power plus Water and Oxygen through Pipe Junctions (2 m³/min each per colonist). Habitats placed touching each other share water and oxygen, so one junction of each feeds the whole block. With Rations by belt (0.5 per colonist per minute) it holds 20. On Rime it also needs Steam for warmth (1 m³/min per colonist). Supplied, it gains a colonist every 20 s; short of water, oxygen, power or warmth, it loses one. Colonists crew specialist machines. Only on the Moon and Rime.'});
/* Session 65: fed = capacity with Rations, food = Rations per colonist per minute, warm = Steam per colonist per minute on Rime.
   heat stays 1 (the 3× power of Session 64 was replaced by steam). LANDER = crew that comes with the first rocket to a world. */
const HAB={cap:10,fed:20,per:2,food:0.5,warm:1,grow:20,heat:1};
const CREW_LANDER=4;
D('hydro',{n:'Hydroponics Bay',k:'mach',mt:'hydro',w:3,pw:30,crew:1,only:'moon',cat:'prod',col:'#6fbf5a',cost:{iron_plate:30,copper_sheet:20,quartz_crystal:10,concrete:30},desc:'Grows food under lamps. Pick its recipe, pipe Water in through a Pipe Junction and belt a little Regolith in; Rations come out on a belt, carry them to your Habitats. The plants also give off oxygen: take it out through a second Pipe Junction on its own pipe, or it is simply released. Needs 1 crew. Only on the Moon.'});
D('hothouse',{n:'Hothouse',k:'mach',mt:'hothouse',w:3,pw:10,crew:1,only:'rime',cat:'prod',col:'#7fcf6a',cost:{iron_plate:30,copper_sheet:20,steel_pipe:20,concrete:30},desc:'A steam-heated greenhouse. Pick its recipe and pipe Water and Steam in (one Pipe Junction each, on separate pipes); Rations come out on a belt, carry them to your Habitats. The plants also give off oxygen: take it out through another Pipe Junction, or it is simply released. Needs 1 crew. Only on Rime.'});
D('hexch',{n:'Heat Exchanger',k:'pump',w:2,rate:2,pw:5,steam:1,only:'rime',cat:'ext',col:'#e8a87c',cost:{iron_plate:20,copper_sheet:20,cable:10},desc:'Sits on a steam geyser and pipes out its Steam: 120 m³/min on a normal geyser (out through a Pipe Junction). Habitats on Rime need Steam for warmth, Hothouses for growing. Only on Rime.'});   /* colonists per habitat, water and oxygen per colonist per minute, seconds per colonist gained or lost */
D('incin',{n:'Incinerator',k:'incin',w:2,cat:'prod',col:'#a03020',cost:{concrete:10,iron_plate:10},desc:'Destroys anything delivered to it.'});
D('solar',{n:'Solar Panel',k:'gen',w:2,cap:10,fuels:[],solar:1,only:'moon',link:6,sup:4,cat:'pow',col:'#2a3e6a',cost:{alloy_panel:4,circuit_board:2,wire:10},desc:'10 MW from sunlight, no fuel. Only works in the Moon\u2019s unfiltered sunlight.'});
D('solar2',{n:'Solar Array',k:'gen',w:4,cap:60,fuels:[],solar:1,only:'moon',link:8,sup:6,cat:'pow',col:'#2a3e6a',cost:{alloy_panel:16,vac_wafer:8,steel_beam:6,wire:20},desc:'60 MW from sunlight, no fuel: 50% more power per tile than Solar Panels. Arrays placed touching each other (or panels) join one network. Only on the Moon.'});
D('fusion',{n:'Helium Fusion Reactor',k:'gen',w:6,cap:1500,fuels:['helium'],water:120/(1500*60),only:'moon',link:10,sup:7,cat:'pow',col:'#7fd6ff',cost:{steel_beam:60,cased_girder:40,motor:20,lattice:20,vac_wafer:40,copper_sheet:80},desc:'1500 MW from Helium Crystals (30/min at full load) plus 120 m³/min of water for cooling (through a Pipe Junction). Only on the Moon.'});
D('burner',{n:'Coal Burner',k:'gen',w:2,cap:30,fuels:['coal','petro_coke'],link:8,sup:5,cat:'pow',col:'#7a4a2a',cost:{iron_plate:15,iron_rod:15,wire:20},desc:'30 MW. Burns coal or petroleum coke. Also acts as a power pole.'});
D('steam',{n:'Steam Generator',k:'gen',w:3,cap:75,fuels:['coal','petro_coke'],water:45/(75*60),link:8,sup:5,cat:'pow',col:'#6a5a4a',cost:{rotor:10,braced_plate:10,cable:30,concrete:20},desc:'75 MW. Needs coal/coke plus 45 m³/min water.'});
D('turbine',{n:'Fuel Turbine',k:'gen',w:3,cap:150,fuels:['fuel'],link:8,sup:5,cat:'pow',col:'#9a6a1a',cost:{motor:15,cased_girder:15,rubber:50,steel_pipe:30},desc:'150 MW. Burns liquid fuel (12 m³/min).'});
D('reactor',{n:'Fission Reactor',k:'gen',w:4,cap:2500,fuels:['fuel_rod'],water:240/(2500*60),link:8,sup:5,cat:'pow',col:'#3a8a3a',cost:{heavy_truss:25,compute_module:25,cased_girder:100,control_chip:10},desc:'2500 MW. Fuel rods + 240 m³/min water. Outputs nuclear waste — belt it away!'});
D('pole1',{n:'Power Pole',k:'pole',link:10,sup:6,cat:'pow',col:'#c8a040',cost:{wire:3,concrete:1},ow:1,desc:'Powers buildings within 6 tiles. Power lines: tap a start (or an existing pole), then tap where the line goes (up to 10 tiles): a wire joins them and the line continues. Tap the last pole again to finish.'});
D('pswitch',{n:'Power Switch',k:'pole',link:10,sup:0,cat:'pow',col:'#5be36a',cost:{iron_plate:4,wire:6},ow:1,desc:'Connects wires like a pole but powers nothing around it. Turn it off to cut everything behind it from the grid. Give it a name, e.g. the factory it feeds.'});
D('pole2',{n:'Power Tower',k:'pole',link:24,sup:9,cat:'pow',col:'#e0c060',cost:{cable:10,braced_plate:2,concrete:5},ow:1,desc:'Powers buildings within 9 tiles. Wires reach 24 tiles: tap a start, then tap where the line goes; tap the last tower again to finish.'});

const CATS=[['log','Logistics'],['fluid','Fluids'],['ext','Extraction'],['prod','Production'],['pow','Power'],['trans','Transport'],['sign','Signs'],['bp','Blueprints']];
const MS=[
{n:'Field Assembly',req:{iron_plate:100,iron_rod:100,wire:100},b:['assembler','belt2','incin','fmeter','pswitch'],r:['r_braced_plate','r_rotor','r_copper_sheet']},
{n:'Structural Works',req:{braced_plate:50,rotor:30,concrete:200,cable:100},b:['pipe1','junction','valve','wpump','tank','lsplit'],r:['r_truss_frame','r_stitched_plate','r_cast_bolts']},
{n:'Steam Power',req:{truss_frame:25,rotor:50,copper_sheet:100,cable:200},b:['steam','pole2','drill2']},
{n:'Steelworks',req:{truss_frame:50,braced_plate:100,concrete:500,cable:300},b:['foundry','belt3'],r:['r_steel_ingot','r_steel_beam','r_steel_pipe','r_cased_girder','r_stator','r_motor','r_steel_rod','r_iron_alloy'],oc:1},
{n:'Heavy Industry',req:{motor:50,cased_girder:100,stator:100,steel_pipe:300},b:['fabricator','dpad'],r:['r_heavy_truss','r_iron_wire','r_steel_rotor']},
{n:'Petrochemistry',req:{heavy_truss:10,motor:100,steel_beam:300,cased_girder:200},b:['opump','refinery','turbine','pipe2','belt4','rail','rswitch','tstop','cbay'],r:['r_plastic','r_rubber','r_fuel','r_residual_fuel','r_petro_coke','r_residual_plastic','r_residual_rubber','r_wet_concrete','r_circuit_board','r_coke_steel','r_insulated_cable']},
{n:'Electronics',req:{plastic:300,rubber:300,circuit_board:100,heavy_truss:20},b:[],r:['r_compute_module','r_data_bus','r_quartz_crystal','r_silica','r_resonator']},
{n:'Lightweight Alloys',req:{compute_module:25,data_bus:50,resonator:100,steel_pipe:500},b:['blender','drill3'],r:['r_alumina','r_wet_alumina','r_alu_scrap','r_alu_ingot','r_pure_alu','r_alu_casing','r_alloy_panel','r_heat_sink','r_acid','r_battery','r_coolant_block','r_control_chip']},
{n:'Nuclear Age',req:{alloy_panel:300,heat_sink:100,battery:200,control_chip:20},b:['reactor','belt5'],r:['r_uranium_cell','r_fuel_rod','r_turbine_core','r_quantum_core']},
{n:'Orbital Beacon',req:{turbine_core:50,quantum_core:50,fuel_rod:10},b:['lpad','solar','vfurnace'],r:['r_hull_plate','r_heat_shield','r_guidance_core','r_rocket_fuel','r_vac_wafer','r_lattice'],win:1,goal:'Build a Launch Pad and launch the colony rocket to the Moon.'},   /* Session 57: Tier 11 removed; the rocket itself is the next goal */
];
MS.forEach(m=>{m.b=m.b||[];m.r=m.r||[];});
/* World goals (Session 58): what to do on a world other than Home. Delivered from that world's own stock; progress in S.wms[world].
   'next' = text shown after the last goal. Unlocks count everywhere, like tiers. */
/* Session 65 (Markus: "colony first, then grow it, then the sphere materials"): colonists are the crew of specialist machines (crew),
   food (Rations) lets Habitats grow from 10 to 20, Rime Habitats need warmth (steam). Moon list keeps 6 entries so saves map 1:1. */
const WGOALS={moon:[
 {n:'Landing Camp',req:{iron_plate:200,copper_sheet:100,wire:200},b:['rexc','imelt','habitat','rdepot','tdepot'],r:['r_sinter','r_lunarcrete','r_o2_regolith','r_vac_steel'],why:'Set up camp: dig regolith for blocks, melt crater ice for water, make oxygen and Lunar Steel for Habitats. Then the first Habitats: your 4 lander crew can run two specialist machines, everything more needs colonists.'},
 {n:'Water & Air',req:{concrete:200},pop:10,b:[],r:['r_wafer_cb','r_moon_alu','r_o2_water'],why:'Keep 10 colonists alive: water, oxygen and power to every Habitat. Colonists are the crew of Vacuum Furnaces.'},
 {n:'Lunar Power',req:{vac_wafer:100,lattice:50},pop:15,rate:{concrete:30},b:['solar2','hydro'],r:['r_hydro'],why:'A steady base with more power. Unlocks the Hydroponics Bay: with Rations, a Habitat holds 20 colonists instead of 10.'},
 {n:'Hydroponics',req:{},pop:30,rate:{steel_pipe:15,concrete:30},b:['fusion'],r:[],why:'Feed the colony and let it grow: belt Rations into the Habitats. More colonists = more crew for the specialist machines.'},
 {n:'Self-Sufficient',req:{},pop:40,rate:{motor:6,steel_beam:15,vac_wafer:20},b:['fport','slaunch','geoturb','sdepot','stdepot'],r:['r_cryo_rod','r_lattice_qc','r_sphere_frame'],why:'The colony builds its own machines: motors and beams from Moon steel, wafers for its electronics.'},
 {n:'Export Ready',req:{helium:1000,vac_wafer:300,lattice:100},pop:50,b:[],r:[],why:'A stockpile for the Dyson Sphere, and a colony big enough for the next step.',next:'Next on the Moon: Mirror Works (Mirror Film for the Dyson Sphere shell), coming in the next update. Meanwhile, Orbital Freighters trade with Earth and Rime.'}]};
WGOALS.rime=[   /* Session 64, reworked in Session 65: warmth and food first, then coils */
 {n:'Landfall',req:{iron_plate:200,copper_sheet:100,concrete:100},b:['hexch','cryoplant'],r:['r_thaw','r_frost_steel','r_cryo_o2'],why:'Settle on the ice: thaw cryo ice for water and frozen air for oxygen, quench Frost Steel without coal, and tap a steam geyser with a Heat Exchanger: Habitats on Rime need steam for warmth.'},
 {n:'Warm Hearth',req:{steel_beam:50},pop:10,b:['gasx'],r:['r_sc_coil'],why:'Keep 10 colonists warm and alive: water, oxygen, steam and power to every Habitat. They crew the Cryo Plants.'},
 {n:'Rare Gas',req:{steel_pipe:200,cable:200},pop:20,rate:{sc_coil:2},b:['hothouse'],r:['r_hothouse'],why:'Catch Rare Gas and wind the first Superconductor Coils. Unlocks the Hothouse: Rations from water and steam.'},
 {n:'Hothouse',req:{},pop:35,rate:{sc_coil:4,steel_pipe:15},b:[],r:['r_sphere_panel','r_coil_motor'],why:'Feed the colony so it can grow. Steady coils unlock Sphere Panels on Earth: the Dyson Sphere’s second stage.'},
 {n:'Cold Lab',req:{},pop:50,rate:{sc_coil:8},b:[],r:[],why:'A growing colony and a steady coil line: enough to ship coils to Earth for the Sphere Panels.',next:'Fly the coils to Home with Orbital Freighters (set a freighter’s destination to Rime) and clad the Dyson Sphere with Sphere Panels. Next on Rime: Cryo Conduits for the shell, coming in the next update.'}];
const onWorld=(d,w)=>!d.only||(Array.isArray(d.only)?d.only.includes(w):d.only===w);   /* d.only: a world id or a list of them (Session 64) */
const theW=w=>(w==='moon'?'the ':'')+WORLDS[w].n;   /* 'the Moon', but 'Rime', 'Home' */
const onlyTxt=d=>'Only on '+[].concat(d.only).map(theW).join(' and ');
const WG_HOLD=180;   /* seconds a rate goal must be held */
const WG_TOL=0.85;   /* the hold keeps counting while every rate is at least 85% of its target (Session 61h, Markus: allow 10–20% deviation) */
for(const w in WGOALS)WGOALS[w].forEach(m=>{m.b=m.b||[];m.r=m.r||[];});
const START_B=[...SIGNS,'zone','bpstation','bplist','belt1','splitter','merger','crossing','storage','soutlet','drill1','smelter','press','burner','pole1'];
const START_R=['r_iron_ingot','r_copper_ingot','r_iron_plate','r_iron_rod','r_bolts','r_wire','r_cable','r_concrete'];
const START_INV={coal:40,iron_plate:120,iron_rod:80,wire:120,cable:60,concrete:60,bolts:200};
/* Biomes (new maps only; old 128×128 maps are all Greenvale). Index = value in bio[].
   t: [water below, sand band width, rock if noise above, rock detail above]  ·  pal: ground colours for the painter
   res: resource weights · pure: purity bias (+ = more pure nodes) · dens: node density
   d2: 2D painted detail · d3: 3D decoration chances per tile */
/* Per-device display options (not part of the save) */
const OPT={eff:true,pin:false};try{Object.assign(OPT,JSON.parse(localStorage.getItem('frontierworks_opts')||'{}'));}catch(e){}
function saveOpt(){try{localStorage.setItem('frontierworks_opts',JSON.stringify(OPT));}catch(e){}}
const BIOMES=[
 {id:'greenvale',n:'Greenvale',desc:'Gentle meadows around the landing site.',t:[0.30,0.04,0.70,0.45],
  pal:{ga:[40,74,42],gb:[62,102,50],gc:[98,134,60],sa:[212,192,140],ra:[122,118,110],rb:[108,105,99],sh:[66,160,204],dp:[18,62,118]},
  d2:{tuft:['rgba(18,44,20,0.5)','rgba(160,200,100,0.32)'],flower:0.05,stone:0.012,rock:'#8a8680'},
  d3:{tree:0.035,bush:0.035,rock:0.42,rockc:'#8b857a'},
  res:{iron:5,copper:4,limestone:3.5,coal:3.5,sulfur:0.6,quartz:0.6,bauxite:0.4,oil:0.5,uranium:0.1},pure:0,dens:1},
 {id:'pinewood',n:'Pinewood',desc:'Dense conifer forest. Rich in coal and limestone.',t:[0.28,0.03,0.72,0.5],
  pal:{ga:[28,58,34],gb:[42,80,42],gc:[68,102,50],sa:[190,172,128],ra:[112,110,104],rb:[98,97,92],sh:[60,140,180],dp:[16,54,96]},
  d2:{tuft:['rgba(10,30,14,0.55)','rgba(120,170,80,0.28)'],flower:0.012,stone:0.01,rock:'#7e7c76'},
  d3:{tree:0.3,bush:0.05,rock:0.35,rockc:'#7d7a72'},
  res:{iron:3,copper:2,limestone:4,coal:5,sulfur:0.4,quartz:0.8,bauxite:0.6,oil:0.6,uranium:0.2},pure:0,dens:1},
 {id:'dustreach',n:'Dustreach',desc:'Dry dunes and red rock. Oil, sulfur and quartz.',t:[0.17,0.25,0.66,0.4],
  pal:{ga:[150,128,78],gb:[176,152,96],gc:[196,170,112],sa:[228,202,142],ra:[168,118,84],rb:[150,104,74],sh:[70,150,180],dp:[22,70,110]},
  d2:{tuft:['rgba(110,84,40,0.45)','rgba(230,210,150,0.3)'],flower:0,stone:0.01,rock:'#a8775a',sand:'rgba(150,110,60,0.4)'},
  d3:{cactus:0.03,dead:0.006,rock:0.25,rockc:'#b07a58'},
  res:{iron:1.5,copper:2.5,limestone:2,coal:0.5,sulfur:3.5,quartz:3.5,bauxite:1.5,oil:4,uranium:0.5},pure:0.3,dens:0.9},
 {id:'craglands',n:'Craglands',desc:'Bare grey rock. Iron, bauxite and quartz, often pure.',t:[0.24,0.03,0.55,0.3],
  pal:{ga:[62,80,52],gb:[84,102,64],gc:[110,122,80],sa:[182,172,150],ra:[134,132,128],rb:[116,114,110],sh:[62,140,190],dp:[18,58,104]},
  d2:{tuft:['rgba(30,44,24,0.45)','rgba(170,190,120,0.25)'],flower:0.004,stone:0.04,rock:'#96938c'},
  d3:{tree:0.02,rock:0.6,rockg:0.04,rockc:'#9a968e'},
  res:{iron:5,copper:2,limestone:2,coal:1.5,sulfur:0.8,quartz:3,bauxite:4,oil:0.3,uranium:0.8},pure:1,dens:1},
 {id:'mirefen',n:'Mirefen',desc:'Wet marshland with many pools. Oil, coal and sulfur.',t:[0.40,0.03,0.80,0.6],
  pal:{ga:[44,62,36],gb:[60,78,42],gc:[82,94,50],sa:[122,106,72],ra:[98,96,84],rb:[86,84,74],sh:[72,112,92],dp:[28,60,58]},
  d2:{tuft:['rgba(20,32,14,0.55)','rgba(140,150,80,0.3)'],flower:0.008,stone:0.006,rock:'#706e62',sand:'rgba(60,48,30,0.45)'},
  d3:{reed:0.35,dead:0.02,bush:0.06,rock:0.2,rockc:'#6f6d62'},
  res:{iron:1.5,copper:2,limestone:1.5,coal:4,sulfur:3,quartz:0.4,bauxite:1,oil:5,uranium:0.3},pure:0,dens:1},
 {id:'frostmark',n:'Frostmark',desc:'Snowfields and ice. Quartz, bauxite and uranium.',t:[0.27,0.02,0.62,0.38],
  pal:{ga:[206,218,228],gb:[224,232,240],gc:[240,246,250],sa:[188,198,206],ra:[118,126,138],rb:[102,110,122],sh:[120,182,216],dp:[40,92,142]},
  d2:{tuft:null,flower:0,stone:0.01,rock:'#8a94a0',speck:['rgba(140,164,190,0.55)',0.12]},
  d3:{snowtree:0.08,rock:0.4,rockc:'#c8d2dc'},
  res:{iron:2,copper:2.5,limestone:0.6,coal:1.5,sulfur:0.8,quartz:4,bauxite:3,oil:1,uranium:3},pure:0.5,dens:1},
 {id:'emberfield',n:'Emberfield',desc:'Volcanic ash and basalt at the far edge. Sulfur and uranium, many pure nodes.',t:[0.20,0.03,0.58,0.35],
  pal:{ga:[52,46,44],gb:[66,58,54],gc:[84,72,64],sa:[92,76,62],ra:[44,40,40],rb:[34,31,31],sh:[64,96,116],dp:[22,40,58]},
  d2:{tuft:null,flower:0,stone:0.02,rock:'#3a3636',speck:['rgba(255,120,40,0.85)',0.02]},
  d3:{dead:0.01,rockg:0.05,rock:0.35,rockc:'#3b3736',crack:0.02},
  res:{iron:0.8,copper:0.8,limestone:1,coal:1.5,sulfur:5,quartz:1.5,bauxite:1.5,oil:1.5,uranium:4},pure:1.5,dens:1.15},
 /* Moon biomes (Session 49): only used by genMoon; genBiome and its resource top-up look at the first EARTH_NB biomes only */
 {id:'mare',n:'Lunar Mare',desc:'Dark, flat basalt plains. Iron-rich.',t:[0,0,0.9,0.9],
  pal:{ga:[50,50,56],gb:[66,66,72],gc:[84,84,90],sa:[104,102,100],ra:[128,128,132],rb:[112,112,116],sh:[40,40,48],dp:[22,22,28]},
  d2:{flower:0,stone:0.012,rock:'#8c8c92',speck:['rgba(220,220,230,0.18)',0.3]},d3:{tree:0,bush:0,rock:0.55,rockc:'#7a7a80'},res:{},pure:0.5,dens:1},
 {id:'highland',n:'Lunar Highlands',desc:'Bright, cratered uplands. Quartz and aluminium ore.',t:[0,0,0.9,0.9],
  pal:{ga:[118,118,124],gb:[142,142,148],gc:[166,166,172],sa:[184,182,176],ra:[196,196,200],rb:[172,172,178],sh:[60,60,68],dp:[30,30,36]},
  d2:{flower:0,stone:0.012,rock:'#c4c4ca',speck:['rgba(255,255,255,0.22)',0.35]},d3:{tree:0,bush:0,rock:0.7,rockc:'#b2b2b8'},res:{},pure:0.5,dens:1},
 /* Rime biomes (Session 63): only used by genRime. terr 2 = frozen sea (buildable), 3 = glacier cliffs */
 {id:'snowfield',n:'Snowfields',desc:'Wind-packed snow under a pale sky. Ores, cryo ice and steam geysers.',t:[0,0,0.9,0.9],
  pal:{ga:[214,224,234],gb:[228,236,244],gc:[242,247,251],sa:[158,204,232],ra:[120,170,210],rb:[100,150,196],sh:[140,190,224],dp:[90,140,190]},
  d2:{flower:0,stone:0.004,rock:'#9cc4e4',speck:['rgba(140,180,220,0.4)',0.15]},d3:{snowtree:0.03,rock:0.25,rockc:'#cfe3f0'},res:{},pure:0.4,dens:1},
 {id:'glacier',n:'Glacier',desc:'Blue ice and cliffs. Quartz and uranium, rich cryo ice.',t:[0,0,0.9,0.9],
  pal:{ga:[188,212,232],gb:[204,224,240],gc:[222,236,248],sa:[150,198,230],ra:[96,150,200],rb:[80,132,186],sh:[130,182,220],dp:[80,130,180]},
  d2:{flower:0,stone:0.01,rock:'#7fb0dc',speck:['rgba(255,255,255,0.5)',0.25]},d3:{snowtree:0.005,rock:0.5,rockc:'#a8cbe8'},res:{},pure:0.8,dens:1}
];
const NODE_T={iron:['iron_ore','#b0705a'],copper:['copper_ore','#e0843f'],limestone:['limestone','#e6dcbc'],coal:['coal','#3a3a3a'],sulfur:['sulfur','#f0dc40'],quartz:['quartz','#f0c0ee'],bauxite:['bauxite','#c4542e'],uranium:['uranium','#80f050'],oil:['crude','#1a1420'],helium:['helium','#8fe6ff'],ice:['ice','#d4f1ff'],cryo:['cryo_ice','#9fd8ff'],geyser:['rare_gas','#eaf6ff']};
const MOON_RES=['helium','ice','cryo','geyser'];   /* off-world resources: never on Home maps */   /* never on Home maps (genBiome skips them) */
const PUR=[[0.5,'Impure'],[1,'Normal'],[2,'Pure']];

/* Worlds (Session 49, DESIGN.md section 12). The world you're on lives in the normal game state; the others are packed into S.worlds.
   gen 3 = Moon generator (genMoon). ext = coast ring (MAP_EXT on Home, none on the Moon). */
const WORLDS={home:{n:'Home',ic:'🌍'},moon:{n:'Moon',ic:'🌑',gen:3,mw:256,ext:0},rime:{n:'Rime',ic:'❄️',gen:4,mw:256,ext:0}};   /* Rime: the ice planet (Session 63) */
const WKEYS=['seed','gen','mw','ext','zones','zmap','cam','inv','bg','trains'];   /* per-world parts of S; everything else (unlocks, tiers, settings) is shared */
