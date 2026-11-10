'use strict';
/* ================= DATA ================= */
const TS=24, MW=128, MH=128, DX=[1,0,-1,0], DY=[0,1,0,-1], ARW=['→','↓','←','↑'];
const IT={};
function I(id,n,c,f,e){IT[id]={id,n,c,f:!!f,e:e||0};}
I('iron_ore','Iron Ore','#a0614e');I('copper_ore','Copper Ore','#d27a3a');I('limestone','Limestone','#d9cfb0');
I('coal','Coal','#2a2a2a',0,150);I('sulfur','Sulfur','#e6d33a');I('quartz','Raw Quartz','#e9b8e6');
I('bauxite','Bauxite','#b4482a');I('uranium','Uranium Ore','#73e04a');I('crude','Crude Oil','#2e2236',1);I('water','Water','#3d8ee6',1);
I('iron_ingot','Iron Ingot','#a3a9b1');I('copper_ingot','Copper Ingot','#e08d4c');I('steel_ingot','Steel Ingot','#5f6a77');I('alu_ingot','Aluminum Ingot','#dbe3ea');
I('iron_plate','Iron Plate','#c3c9d1');I('iron_rod','Iron Rod','#8a93a3');I('bolts','Bolts','#b0b8c6');I('wire','Wire','#f0a54a');
I('cable','Cable','#3b3b70');I('concrete','Concrete','#b5b5aa');I('copper_sheet','Copper Sheet','#e8955f');I('steel_beam','Steel Beam','#47525e');
I('steel_pipe','Steel Pipe','#6f7e90');I('quartz_crystal','Quartz Crystal','#f4a8f0');I('silica','Silica','#f3f3f3');I('alu_casing','Aluminum Casing','#c6d0da');
I('braced_plate','Braced Plate','#7d8fa2');I('truss_frame','Truss Frame','#5878a6');I('rotor','Rotor','#8f6c48');I('cased_girder','Cased Girder','#91917c');
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
D('pipe1',{n:'Pipeline Mk1',k:'pipe',spd:5,cat:'log',col:'#6f93b8',cost:{copper_sheet:1},ow:1,desc:'300 m³/min of fluid. Drag to lay.'});
D('pipe2',{n:'Pipeline Mk2',k:'pipe',spd:10,cat:'log',col:'#d6a640',cost:{copper_sheet:1,plastic:1},ow:1,desc:'600 m³/min of fluid.'});
D('splitter',{n:'Splitter',k:'router',sub:'split',cat:'log',col:'#d08a2a',cost:{iron_plate:2,cable:2},ow:1,desc:'Input from the back, splits to front/left/right.'});
D('merger',{n:'Merger',k:'router',sub:'merge',cat:'log',col:'#2a9ad0',cost:{iron_plate:2,cable:2},ow:1,desc:'Inputs from back/left/right, outputs to the front.'});
D('sorter',{n:'Sorting Splitter',k:'router',sub:'sort',cat:'log',col:'#9a50d0',cost:{braced_plate:1,cable:5},ow:1,desc:'Filtered item goes front, everything else left/right. Tap it to set the filter.'});
D('crossing',{n:'Crossing',k:'cross',cat:'log',col:'#6c6c6c',cost:{iron_plate:3,bolts:6},ow:1,desc:'Lets two belts/pipes cross each other.'});
D('junction',{n:'Pipe Junction',k:'router',sub:'junc',fl:1,cat:'log',col:'#4a7aa8',cost:{copper_sheet:4},ow:1,desc:'Splits fluid to all other sides.'});
D('storage',{n:'Storage Crate',k:'storage',w:2,cap:2000,cat:'log',col:'#7a6040',cost:{iron_plate:10,iron_rod:10},desc:'Buffers 2000 items; passes them on to outgoing belts.'});
D('tank',{n:'Fluid Tank',k:'tank',w:2,cap:400,cat:'log',col:'#3a6a90',cost:{copper_sheet:20,braced_plate:4},desc:'Buffers 400 m³ of one fluid.'});
D('incin',{n:'Incinerator',k:'incin',cat:'log',col:'#a03020',cost:{concrete:10,iron_plate:10},desc:'Destroys anything delivered to it.'});
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
D('burner',{n:'Coal Burner',k:'gen',w:2,cap:30,fuels:['coal','petro_coke'],link:8,sup:5,cat:'pow',col:'#7a4a2a',cost:{iron_plate:15,iron_rod:15,wire:20},desc:'30 MW. Burns coal or petroleum coke. Also acts as a power pole.'});
D('steam',{n:'Steam Generator',k:'gen',w:3,cap:75,fuels:['coal','petro_coke'],water:45/(75*60),link:8,sup:5,cat:'pow',col:'#6a5a4a',cost:{rotor:10,braced_plate:10,cable:30,concrete:20},desc:'75 MW. Needs coal/coke plus 45 m³/min water.'});
D('turbine',{n:'Fuel Turbine',k:'gen',w:3,cap:150,fuels:['fuel'],link:8,sup:5,cat:'pow',col:'#9a6a1a',cost:{motor:15,cased_girder:15,rubber:50,steel_pipe:30},desc:'150 MW. Burns liquid fuel (12 m³/min).'});
D('reactor',{n:'Fission Reactor',k:'gen',w:4,cap:2500,fuels:['fuel_rod'],water:240/(2500*60),link:8,sup:5,cat:'pow',col:'#3a8a3a',cost:{heavy_truss:25,compute_module:25,cased_girder:100,control_chip:10},desc:'2500 MW. Fuel rods + 240 m³/min water. Outputs nuclear waste — belt it away!'});
D('pole1',{n:'Power Pole',k:'pole',link:10,sup:6,cat:'pow',col:'#c8a040',cost:{wire:3,concrete:1},ow:1,desc:'Links to poles within 10 tiles, powers buildings within 6.'});
D('pole2',{n:'Power Tower',k:'pole',link:24,sup:9,cat:'pow',col:'#e0c060',cost:{cable:10,braced_plate:2,concrete:5},ow:1,desc:'Links within 24 tiles, powers within 9.'});

const CATS=[['log','Logistics'],['ext','Extraction'],['prod','Production'],['pow','Power']];
const MS=[
{n:'Field Assembly',req:{iron_plate:100,iron_rod:100,wire:100},b:['assembler','belt2','incin'],r:['r_braced_plate','r_rotor','r_copper_sheet']},
{n:'Structural Works',req:{braced_plate:50,rotor:30,concrete:200,cable:100},b:['pipe1','junction','wpump','tank','sorter'],r:['r_truss_frame','r_stitched_plate','r_cast_bolts']},
{n:'Steam Power',req:{truss_frame:25,rotor:50,copper_sheet:100,cable:200},b:['steam','pole2','drill2']},
{n:'Steelworks',req:{truss_frame:50,braced_plate:100,concrete:500,cable:300},b:['foundry','belt3'],r:['r_steel_ingot','r_steel_beam','r_steel_pipe','r_cased_girder','r_stator','r_motor','r_steel_rod','r_iron_alloy'],oc:1},
{n:'Heavy Industry',req:{motor:50,cased_girder:100,stator:100,steel_pipe:300},b:['fabricator'],r:['r_heavy_truss','r_iron_wire','r_steel_rotor']},
{n:'Petrochemistry',req:{heavy_truss:10,motor:100,steel_beam:300,cased_girder:200},b:['opump','refinery','turbine','pipe2','belt4'],r:['r_plastic','r_rubber','r_fuel','r_residual_fuel','r_petro_coke','r_residual_plastic','r_residual_rubber','r_wet_concrete','r_circuit_board','r_coke_steel','r_insulated_cable']},
{n:'Electronics',req:{plastic:300,rubber:300,circuit_board:100,heavy_truss:20},b:[],r:['r_compute_module','r_data_bus','r_quartz_crystal','r_silica','r_resonator']},
{n:'Lightweight Alloys',req:{compute_module:25,data_bus:50,resonator:100,steel_pipe:500},b:['blender','drill3'],r:['r_alumina','r_alu_scrap','r_alu_ingot','r_pure_alu','r_alu_casing','r_alloy_panel','r_heat_sink','r_acid','r_battery','r_coolant_block','r_control_chip']},
{n:'Nuclear Age',req:{alloy_panel:300,heat_sink:100,battery:200,control_chip:20},b:['reactor','belt5'],r:['r_uranium_cell','r_fuel_rod','r_turbine_core','r_quantum_core']},
{n:'Orbital Beacon',req:{turbine_core:50,quantum_core:50,fuel_rod:10},b:[],r:[],win:1},
];
MS.forEach(m=>{m.b=m.b||[];m.r=m.r||[];});
const START_B=['belt1','splitter','merger','crossing','storage','drill1','smelter','press','burner','pole1'];
const START_R=['r_iron_ingot','r_copper_ingot','r_iron_plate','r_iron_rod','r_bolts','r_wire','r_cable','r_concrete'];
const START_INV={coal:40,iron_plate:120,iron_rod:80,wire:120,cable:60,concrete:60,bolts:200};
const NODE_T={iron:['iron_ore','#b0705a'],copper:['copper_ore','#e0843f'],limestone:['limestone','#e6dcbc'],coal:['coal','#3a3a3a'],sulfur:['sulfur','#f0dc40'],quartz:['quartz','#f0c0ee'],bauxite:['bauxite','#c4542e'],uranium:['uranium','#80f050'],oil:['crude','#1a1420']};
const PUR=[[0.5,'Impure'],[1,'Normal'],[2,'Pure']];
