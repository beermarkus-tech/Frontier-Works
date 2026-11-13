'use strict';
/* ================= DATA ================= */
let MW=128, MH=128;   // map size: 128 for maps made before biomes, MAP_NEW for new maps (stored in the save as S.mw)
const MAP_NEW=384, TS=24, DX=[1,0,-1,0], DY=[0,1,0,-1], ARW=['→','↓','←','↑'];
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

const RC={}, RL=[];
function pr(s){const o={};s.split(',').forEach(p=>{const [k,v]=p.split(':');o[k.trim()]=+v;});return o;}
function R(id,n,m,t,i,o,alt){const r={id,n,m,t,i:pr(i),o:pr(o),alt:!!alt};RC[id]=r;RL.push(r);}
// Smelter
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
R('r_alu_scrap','Aluminum Scrap','refinery',4,'alumina:4,petro_coke:2','alu_scrap:6,water:2');
R('r_acid','Sulfuric Acid','refinery',6,'sulfur:5,water:5','acid:5');
// Fabricator
R('r_heavy_truss','Heavy Truss','fabricator',30,'truss_frame:5,steel_pipe:15,cased_girder:5,bolts:100','heavy_truss:1');
R('r_compute_module','Compute Module','fabricator',24,'circuit_board:10,cable:9,plastic:18,bolts:52','compute_module:1');
R('r_data_bus','Data Bus','fabricator',16,'wire:50,cable:10,circuit_board:1','data_bus:1');
R('r_control_chip','Control Chip','fabricator',32,'compute_module:2,data_bus:3,resonator:2,plastic:28','control_chip:1');
R('r_turbine_core','Turbine Core','fabricator',32,'motor:4,coolant_block:3,data_bus:2,rubber:24','turbine_core:1');
R('r_fuel_rod','Fuel Rod','fabricator',150,'uranium_cell:50,cased_girder:3,steel_beam:6','fuel_rod:1');
R('r_quantum_core','Quantum Core','fabricator',60,'control_chip:2,compute_module:3,heat_sink:6,battery:10','quantum_core:1');
// Blender
R('r_uranium_cell','Uranium Cell','blender',12,'uranium:10,concrete:3,acid:8','uranium_cell:5,acid:2');
R('r_battery','Battery','blender',6,'acid:5,alumina:4,alu_casing:2','battery:2,water:3');
R('r_coolant_block','Coolant Block','blender',10,'heat_sink:2,rubber:2,water:10','coolant_block:1');

const B={};
function D(id,o){o.id=id;o.w=o.w||1;o.cost=o.cost||{};B[id]=o;}
D('core',{n:'Base Core',sn:'CORE',k:'core',w:4,col:'#b8862a',desc:'Delivers anything belted in to your item stock.'});
D('belt1',{n:'Conveyor Mk1',k:'belt',spd:1,cat:'log',col:'#9aa0a8',cost:{iron_plate:1},ow:1,desc:'60 items/min. Drag to lay a line.'});
D('belt2',{n:'Conveyor Mk2',k:'belt',spd:2,cat:'log',col:'#e0c040',cost:{iron_plate:1,bolts:6},ow:1,desc:'120 items/min. Draw over old belts to upgrade.'});
D('belt3',{n:'Conveyor Mk3',k:'belt',spd:4.5,cat:'log',col:'#ee7a30',cost:{steel_beam:1},ow:1,desc:'270 items/min'});
D('belt4',{n:'Conveyor Mk4',k:'belt',spd:8,cat:'log',col:'#40b8ee',cost:{steel_pipe:1,plastic:1},ow:1,desc:'480 items/min'});
D('belt5',{n:'Conveyor Mk5',k:'belt',spd:13,cat:'log',col:'#c25cf0',cost:{alloy_panel:1,plastic:1},ow:1,desc:'780 items/min'});
D('pipe1',{n:'Pipeline Mk1',k:'pipe',spd:5,cat:'fluid',col:'#6f93b8',cost:{copper_sheet:1},ow:1,desc:'300 m³/min of fluid. No direction: connects to touching pipes and junctions. Buildings connect only through a Pipe Junction.'});
D('pipe2',{n:'Pipeline Mk2',k:'pipe',spd:10,cat:'fluid',col:'#d6a640',cost:{copper_sheet:1,plastic:1},ow:1,desc:'600 m³/min of fluid. No direction: connects to touching pipes and junctions. Buildings connect only through a Pipe Junction.'});
D('splitter',{n:'Splitter',k:'router',sub:'split',cat:'log',col:'#d08a2a',cost:{iron_plate:2,cable:2},ow:1,desc:'Input from the back, splits to front/left/right. Outputs go into belts or straight into a building touching that side.'});
D('merger',{n:'Merger',k:'router',sub:'merge',cat:'log',col:'#2a9ad0',cost:{iron_plate:2,cable:2},ow:1,desc:'Inputs from back/left/right (belts, or a machine touching that side), outputs to the front (belt or building).'});
D('sorter',{n:'Sorting Splitter',k:'router',sub:'sort',cat:'log',col:'#9a50d0',cost:{braced_plate:1,cable:5},ow:1,desc:'Filtered item goes front, everything else left/right (into belts or touching buildings). Tap it to set the filter.'});
D('crossing',{n:'Crossing',k:'cross',cat:'log',col:'#6c6c6c',cost:{iron_plate:3,bolts:6},ow:1,desc:'Lets two belts/pipes cross each other.'});
D('fmeter',{n:'Flow Meter',k:'fmeter',cat:'log',col:'#e8eef2',cost:{iron_plate:2,wire:4},ow:1,desc:'Clip it onto a belt or pipe to show how much flows there per minute. Tap the same tile again to take it off.'});
D('junction',{n:'Pipe Junction',k:'router',sub:'junc',fl:1,cat:'fluid',col:'#4a7aa8',cost:{copper_sheet:4},ow:1,desc:'The entry point between pipes and a building: connects all four sides, to pipes and to every building it touches.'});
D('storage',{n:'Storage Crate',k:'storage',w:2,cap:2000,cat:'log',col:'#7a6040',cost:{iron_plate:10,iron_rod:10},desc:'Buffers 2000 items; passes them on to outgoing belts.'});
D('tank',{n:'Fluid Tank',k:'tank',w:2,cap:400,cat:'fluid',col:'#3a6a90',cost:{copper_sheet:20,braced_plate:4},desc:'Buffers 400 m³ of one fluid.'});
D('dpad',{n:'Drone Pad',k:'dpad',w:3,pw:25,cap:400,cat:'trans',col:'#2fa7a0',cost:{motor:4,stator:4,cased_girder:6,cable:30},desc:'Holds 400 items. Link it to another pad and its drone flies them there (40 per trip). An unlinked pad receives drones and passes items to outgoing belts.'});
const DRONE={cap:40,spd:10,load:1.5,unload:1.5,wait:8};   // items per trip, tiles per second, seconds to load / unload, max seconds to wait for a full load
D('sign1',{n:'Sign S',k:'sign',w:1,cat:'sign',col:'#e9e2cf',ow:1,cost:{iron_plate:1},desc:'A 1×1 label. Tap it to write text and pick a colour.'});
D('sign2',{n:'Sign M',k:'sign',w:2,cat:'sign',col:'#e9e2cf',ow:1,cost:{iron_plate:2},desc:'A 2×2 label for a factory or line. Tap it to write text and pick a colour.'});
D('sign3',{n:'Sign L',k:'sign',w:3,cat:'sign',col:'#e9e2cf',ow:1,cost:{iron_plate:4},desc:'A 3×3 label, readable from further out.'});
D('sign4',{n:'Sign XL',k:'sign',w:4,cat:'sign',col:'#e9e2cf',ow:1,cost:{iron_plate:6},desc:'A 4×4 label for whole areas, readable from far out.'});
D('sign5',{n:'Sign XXL',k:'sign',w:6,cat:'sign',col:'#e9e2cf',ow:1,cost:{iron_plate:9},desc:'A 6×6 label for a whole district, readable even at the farthest zoom.'});
const SIGNS=['sign1','sign2','sign3','sign4','sign5'];
D('zone',{n:'Factory Zone',k:'zonetool',cat:'sign',col:'#ffb547',cost:{},ow:1,desc:'Drag over the map to mark one factory’s area. Touching an existing zone makes it bigger. Belts and pipes pass through the fence.'});
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
D('incin',{n:'Incinerator',k:'incin',w:2,cat:'prod',col:'#a03020',cost:{concrete:10,iron_plate:10},desc:'Destroys anything delivered to it.'});
D('burner',{n:'Coal Burner',k:'gen',w:2,cap:30,fuels:['coal','petro_coke'],link:8,sup:5,cat:'pow',col:'#7a4a2a',cost:{iron_plate:15,iron_rod:15,wire:20},desc:'30 MW. Burns coal or petroleum coke. Also acts as a power pole.'});
D('steam',{n:'Steam Generator',k:'gen',w:3,cap:75,fuels:['coal','petro_coke'],water:45/(75*60),link:8,sup:5,cat:'pow',col:'#6a5a4a',cost:{rotor:10,braced_plate:10,cable:30,concrete:20},desc:'75 MW. Needs coal/coke plus 45 m³/min water.'});
D('turbine',{n:'Fuel Turbine',k:'gen',w:3,cap:150,fuels:['fuel'],link:8,sup:5,cat:'pow',col:'#9a6a1a',cost:{motor:15,cased_girder:15,rubber:50,steel_pipe:30},desc:'150 MW. Burns liquid fuel (12 m³/min).'});
D('reactor',{n:'Fission Reactor',k:'gen',w:4,cap:2500,fuels:['fuel_rod'],water:240/(2500*60),link:8,sup:5,cat:'pow',col:'#3a8a3a',cost:{heavy_truss:25,compute_module:25,cased_girder:100,control_chip:10},desc:'2500 MW. Fuel rods + 240 m³/min water. Outputs nuclear waste — belt it away!'});
D('pole1',{n:'Power Pole',k:'pole',link:10,sup:6,cat:'pow',col:'#c8a040',cost:{wire:3,concrete:1},ow:1,desc:'Links to poles within 10 tiles, powers buildings within 6.'});
D('pswitch',{n:'Power Switch',k:'pole',link:10,sup:0,cat:'pow',col:'#5be36a',cost:{iron_plate:4,wire:6},ow:1,desc:'Connects wires like a pole but powers nothing around it. Turn it off to cut everything behind it from the grid. Give it a name, e.g. the factory it feeds.'});
D('pole2',{n:'Power Tower',k:'pole',link:24,sup:9,cat:'pow',col:'#e0c060',cost:{cable:10,braced_plate:2,concrete:5},ow:1,desc:'Links within 24 tiles, powers within 9.'});

const CATS=[['log','Logistics'],['fluid','Fluids'],['ext','Extraction'],['prod','Production'],['pow','Power'],['trans','Transport'],['sign','Signs']];
const MS=[
{n:'Field Assembly',req:{iron_plate:100,iron_rod:100,wire:100},b:['assembler','belt2','incin','fmeter','pswitch'],r:['r_braced_plate','r_rotor','r_copper_sheet']},
{n:'Structural Works',req:{braced_plate:50,rotor:30,concrete:200,cable:100},b:['pipe1','junction','wpump','tank','sorter'],r:['r_truss_frame','r_stitched_plate','r_cast_bolts']},
{n:'Steam Power',req:{truss_frame:25,rotor:50,copper_sheet:100,cable:200},b:['steam','pole2','drill2']},
{n:'Steelworks',req:{truss_frame:50,braced_plate:100,concrete:500,cable:300},b:['foundry','belt3'],r:['r_steel_ingot','r_steel_beam','r_steel_pipe','r_cased_girder','r_stator','r_motor','r_steel_rod','r_iron_alloy'],oc:1},
{n:'Heavy Industry',req:{motor:50,cased_girder:100,stator:100,steel_pipe:300},b:['fabricator','dpad'],r:['r_heavy_truss','r_iron_wire','r_steel_rotor']},
{n:'Petrochemistry',req:{heavy_truss:10,motor:100,steel_beam:300,cased_girder:200},b:['opump','refinery','turbine','pipe2','belt4'],r:['r_plastic','r_rubber','r_fuel','r_residual_fuel','r_petro_coke','r_residual_plastic','r_residual_rubber','r_wet_concrete','r_circuit_board','r_coke_steel','r_insulated_cable']},
{n:'Electronics',req:{plastic:300,rubber:300,circuit_board:100,heavy_truss:20},b:[],r:['r_compute_module','r_data_bus','r_quartz_crystal','r_silica','r_resonator']},
{n:'Lightweight Alloys',req:{compute_module:25,data_bus:50,resonator:100,steel_pipe:500},b:['blender','drill3'],r:['r_alumina','r_alu_scrap','r_alu_ingot','r_pure_alu','r_alu_casing','r_alloy_panel','r_heat_sink','r_acid','r_battery','r_coolant_block','r_control_chip']},
{n:'Nuclear Age',req:{alloy_panel:300,heat_sink:100,battery:200,control_chip:20},b:['reactor','belt5'],r:['r_uranium_cell','r_fuel_rod','r_turbine_core','r_quantum_core']},
{n:'Orbital Beacon',req:{turbine_core:50,quantum_core:50,fuel_rod:10},b:[],r:[],win:1},
];
MS.forEach(m=>{m.b=m.b||[];m.r=m.r||[];});
const START_B=[...SIGNS,'zone','belt1','splitter','merger','crossing','storage','drill1','smelter','press','burner','pole1'];
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
];
const NODE_T={iron:['iron_ore','#b0705a'],copper:['copper_ore','#e0843f'],limestone:['limestone','#e6dcbc'],coal:['coal','#3a3a3a'],sulfur:['sulfur','#f0dc40'],quartz:['quartz','#f0c0ee'],bauxite:['bauxite','#c4542e'],uranium:['uranium','#80f050'],oil:['crude','#1a1420']};
const PUR=[[0.5,'Impure'],[1,'Normal'],[2,'Pure']];
