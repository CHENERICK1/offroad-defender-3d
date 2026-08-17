import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Global State ---
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let carGroup: THREE.Group;
const parts: THREE.Object3D[] = [];
let explodeValue = 0;
let autoRotate = true;

// Lighting & Environment
let mainLight: THREE.DirectionalLight, fillLight: THREE.DirectionalLight, backLight: THREE.DirectionalLight, ambientLight: THREE.AmbientLight;
let gridHelper: THREE.GridHelper;

// Interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredPart: THREE.Object3D | null = null;
let selectedPart: THREE.Object3D | null = null;
let highlightMesh: THREE.BoxHelper;

// --- High Quality PBR Materials ---
const matBodyGreen = new THREE.MeshPhysicalMaterial({
  color: 0x3d5c41,
  roughness: 0.35,
  metalness: 0.15,
  clearcoat: 0.8,
  clearcoatRoughness: 0.15,
});

const matRoofBlack = new THREE.MeshPhysicalMaterial({
  color: 0x111112,
  roughness: 0.2,
  metalness: 0.8,
  clearcoat: 0.9,
  clearcoatRoughness: 0.1,
});

const matTrimBlack = new THREE.MeshStandardMaterial({
  color: 0x1a1a1c,
  roughness: 0.85,
  metalness: 0.05,
});

const matSilverArmor = new THREE.MeshStandardMaterial({
  color: 0xcccccc,
  roughness: 0.3,
  metalness: 0.85,
});

const matGlass = new THREE.MeshPhysicalMaterial({
  color: 0x05080c,
  roughness: 0.05,
  metalness: 0.1,
  transmission: 0.7,
  transparent: true,
  opacity: 0.88,
  ior: 1.52,
});

const matTireRubber = new THREE.MeshStandardMaterial({
  color: 0x181818,
  roughness: 0.92,
  metalness: 0.02,
});

const matRimAlloy = new THREE.MeshStandardMaterial({
  color: 0x222225,
  roughness: 0.25,
  metalness: 0.9,
});

const matRimSilverLip = new THREE.MeshStandardMaterial({
  color: 0xdddddd,
  roughness: 0.2,
  metalness: 0.95,
});

const matBrakeCaliper = new THREE.MeshStandardMaterial({
  color: 0xcc1111,
  roughness: 0.3,
  metalness: 0.4,
});

const matBrakeRotor = new THREE.MeshStandardMaterial({
  color: 0x888890,
  roughness: 0.35,
  metalness: 0.85,
});

const matHeadlightLens = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  roughness: 0.05,
  metalness: 0.1,
  transmission: 0.9,
  transparent: true,
  opacity: 0.85,
});

const matLedHalo = new THREE.MeshBasicMaterial({ color: 0xffffff });
const matHeadlightLed = new THREE.MeshBasicMaterial({ color: 0xeef5ff });
const matTailLightRed = new THREE.MeshPhysicalMaterial({
  color: 0xcc0000,
  roughness: 0.2,
  metalness: 0.1,
  emissive: 0x990000,
  emissiveIntensity: 0.6,
});

const matTowHook = new THREE.MeshStandardMaterial({
  color: 0xd9261c,
  roughness: 0.4,
  metalness: 0.3,
});

const matRecoveryBoard = new THREE.MeshStandardMaterial({
  color: 0xff5a00,
  roughness: 0.7,
  metalness: 0.05,
});

const matLightbarLed = new THREE.MeshBasicMaterial({ color: 0xffffee });
const matBadge = new THREE.MeshStandardMaterial({
  color: 0x153520,
  roughness: 0.3,
  metalness: 0.6,
});

// Canvas Texture Generator for Text Decals
function createTextTexture(text: string, bgColor: string, textColor: string, width = 512, height = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = textColor;
  ctx.font = `bold ${Math.floor(height * 0.52)}px 'Segoe UI', Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  return tex;
}

const texAgility = createTextTexture('DEFENDER 90', '#1c3622', '#e0e0e0', 512, 128);
const matDecalAgility = new THREE.MeshStandardMaterial({ map: texAgility, roughness: 0.4 });

init();
animate();

function init() {
  const container = document.getElementById('canvas-container')!;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x121417);
  scene.fog = new THREE.Fog(0x121417, 20, 90);

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(7.5, 4.2, 8.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 1.1, 0);
  controls.maxPolarAngle = Math.PI / 2 + 0.02; // Don't go deep below ground

  // Lighting
  ambientLight = new THREE.AmbientLight(0xddeeff, 0.65);
  scene.add(ambientLight);

  mainLight = new THREE.DirectionalLight(0xfffaed, 2.2);
  mainLight.position.set(12, 18, 14);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 45;
  mainLight.shadow.camera.left = -6;
  mainLight.shadow.camera.right = 6;
  mainLight.shadow.camera.top = 6;
  mainLight.shadow.camera.bottom = -6;
  mainLight.shadow.bias = -0.0005;
  mainLight.shadow.normalBias = 0.02;
  scene.add(mainLight);

  fillLight = new THREE.DirectionalLight(0x7ea2cc, 1.0);
  fillLight.position.set(-14, 8, -10);
  scene.add(fillLight);

  backLight = new THREE.DirectionalLight(0xffdfba, 1.2);
  backLight.position.set(2, 6, -14);
  scene.add(backLight);

  // Ground Grid & Pedestal
  gridHelper = new THREE.GridHelper(30, 30, 0x38414e, 0x1f242c);
  gridHelper.position.y = 0.002;
  scene.add(gridHelper);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.9, metalness: 0.1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Car Group
  carGroup = new THREE.Group();
  scene.add(carGroup);

  // Helper
  highlightMesh = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1)), 0x00ffcc);
  highlightMesh.visible = false;
  scene.add(highlightMesh);

  buildDefender90();

  // Events
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('click', onClick);

  setupUI();
}

// --- Part Management ---
function registerPart(
  obj: THREE.Object3D,
  name: string,
  category: string,
  info: string,
  explodeDir: [number, number, number]
) {
  obj.userData = {
    name,
    category,
    info,
    basePos: obj.position.clone(),
    explodeDir: new THREE.Vector3(...explodeDir)
  };
  carGroup.add(obj);
  parts.push(obj);
  return obj;
}

// Helper: Rounded Extruded Box
function createChamferBox(w: number, h: number, l: number, radius = 0.04): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + w - radius, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + radius);
  shape.lineTo(x + w, y + h - radius);
  shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  shape.lineTo(x + radius, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  const extrudeSettings = {
    steps: 1,
    depth: l,
    bevelEnabled: true,
    bevelThickness: radius,
    bevelSize: radius,
    bevelSegments: 3
  };
  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.center();
  return geom;
}

// --- High Fidelity Defender 90 Builder ---
function buildDefender90() {
  const L = 4.3;   // Compact 2-door 90 wheelbase length
  const W = 2.05;  // Wide stance

  // 1. CHASSIS & SUBFRAME
  const chassisGroup = new THREE.Group();
  const ladder1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, L - 0.4), matTrimBlack);
  ladder1.position.set(0.5, 0.38, 0);
  ladder1.castShadow = true;
  const ladder2 = ladder1.clone();
  ladder2.position.set(-0.5, 0.38, 0);
  chassisGroup.add(ladder1, ladder2);

  // Crossmembers
  for (let z = -1.5; z <= 1.5; z += 0.75) {
    const cross = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 0.1), matTrimBlack);
    cross.position.set(0, 0.38, z);
    cross.castShadow = true;
    chassisGroup.add(cross);
  }
  chassisGroup.position.set(0, 0, 0);
  registerPart(chassisGroup, "Chassis & Frame", "Structure", "D7x extreme-duty aluminum monocoque architecture with integrated steel subframes.", [0, -0.6, 0]);

  // 2. MAIN LOWER BODY & ROCKER PANELS
  const bodyLowerGeom = createChamferBox(W, 0.65, L - 0.2, 0.05);
  const bodyLower = new THREE.Mesh(bodyLowerGeom, matBodyGreen);
  bodyLower.position.set(0, 0.82, 0);
  bodyLower.castShadow = true;
  bodyLower.receiveShadow = true;
  registerPart(bodyLower, "Lower Body Panels", "Body", "Sculpted aluminum alloy lower body in heritage Pangea Green satin finish.", [0, 0, 0]);

  // 2.1 Lower Plastic Cladding / Rocker Armor
  const rockerL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, L - 1.6), matTrimBlack);
  rockerL.position.set(W / 2 + 0.02, 0.62, 0);
  rockerL.castShadow = true;
  const rockerR = rockerL.clone();
  rockerR.position.set(-W / 2 - 0.02, 0.62, 0);
  const rockersGroup = new THREE.Group();
  rockersGroup.add(rockerL, rockerR);
  registerPart(rockersGroup, "Side Rocker Protectors", "Armor", "Durable textured polyurethane rock rails to protect sills during severe breakover angles.", [0, -0.2, 0]);

  // 3. SCULPTED BONNET / POWER BULGE HOOD
  const hoodGroup = new THREE.Group();
  // Main Hood
  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(-W / 2 + 0.08, 0);
  hoodShape.lineTo(W / 2 - 0.08, 0);
  hoodShape.lineTo(W / 2 - 0.12, 1.25);
  hoodShape.lineTo(-W / 2 + 0.12, 1.25);
  hoodShape.closePath();
  const hoodGeom = new THREE.ExtrudeGeometry(hoodShape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
  hoodGeom.center();
  const hoodMesh = new THREE.Mesh(hoodGeom, matBodyGreen);
  hoodMesh.rotation.x = -Math.PI / 2 - 0.04; // Slight slope forward
  hoodMesh.castShadow = true;
  hoodGroup.add(hoodMesh);

  // Power Bulge Center Island
  const bulge = new THREE.Mesh(createChamferBox(0.9, 0.06, 1.05, 0.02), matBodyGreen);
  bulge.position.set(0, 0.07, 0.05);
  bulge.rotation.x = -0.04;
  hoodGroup.add(bulge);

  // Chequer Plate / Tread Plates on Hood Shoulders
  const plateL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.65), matTrimBlack);
  plateL.position.set(0.68, 0.07, -0.1);
  plateL.rotation.x = -0.04;
  const plateR = plateL.clone();
  plateR.position.set(-0.68, 0.07, -0.1);
  hoodGroup.add(plateL, plateR);

  hoodGroup.position.set(0, 1.2, 1.15);
  registerPart(hoodGroup, "Sculpted Hood & Power Bulge", "Body", "Signature raised bonnet with treadplate inserts and aerodynamic front bevel.", [0, 0.8, 0.8]);

  // 4. FRONT FASCIA, GRILLE & HALO LED HEADLIGHTS
  const frontFasciaGroup = new THREE.Group();
  
  // Front Radiator Grille
  const grilleFrame = new THREE.Mesh(createChamferBox(W - 0.15, 0.35, 0.15, 0.02), matTrimBlack);
  grilleFrame.position.set(0, 0, 0);
  frontFasciaGroup.add(grilleFrame);

  // Grille Slats
  for (let y = -0.08; y <= 0.08; y += 0.08) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.05), matSilverArmor);
    slat.position.set(0, y, 0.08);
    frontFasciaGroup.add(slat);
  }

  // Green Oval Badge
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), matBadge);
  badge.rotation.x = Math.PI / 2;
  badge.position.set(0.35, 0.02, 0.09);
  frontFasciaGroup.add(badge);

  // Matrix LED Headlight Units with Square-in-Circle Halo DRLs
  [-0.72, 0.72].forEach((xPos) => {
    // Square Housing
    const lightBox = new THREE.Mesh(createChamferBox(0.34, 0.28, 0.1, 0.02), matTrimBlack);
    lightBox.position.set(xPos, 0.02, 0.04);
    frontFasciaGroup.add(lightBox);

    // Inner Chrome Reflector
    const reflector = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 24), matRimAlloy);
    reflector.rotation.x = Math.PI / 2;
    reflector.position.set(xPos, 0.02, 0.08);
    frontFasciaGroup.add(reflector);

    // Halo DRL Ring
    const haloGeom = new THREE.TorusGeometry(0.09, 0.015, 8, 24, Math.PI * 1.5);
    const haloMesh = new THREE.Mesh(haloGeom, matLedHalo);
    haloMesh.rotation.z = Math.PI * 0.75;
    haloMesh.position.set(xPos, 0.02, 0.1);
    frontFasciaGroup.add(haloMesh);

    // Projector Lens Bulb
    const lensBulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), matHeadlightLed);
    lensBulb.position.set(xPos, 0.02, 0.1);
    frontFasciaGroup.add(lensBulb);

    // Outer Glass Cover
    const glassCover = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.24), matHeadlightLens);
    glassCover.position.set(xPos, 0.02, 0.11);
    frontFasciaGroup.add(glassCover);
  });

  frontFasciaGroup.position.set(0, 1.05, L / 2 - 0.02);
  registerPart(frontFasciaGroup, "Front Grille & Matrix LED Lights", "Lighting", "Square-in-circle signature LED halo daytime running lights and satin black matrix grille.", [0, 0.2, 1.2]);

  // 5. OFFROAD FRONT BUMPER, WINCH & RECOVERY HOOKS
  const bumperFrontGroup = new THREE.Group();
  // Main Heavy Duty Bumper
  const bFront = new THREE.Mesh(createChamferBox(W + 0.06, 0.32, 0.35, 0.04), matTrimBlack);
  bFront.castShadow = true;
  bumperFrontGroup.add(bFront);

  // Silver Underbody Skid Plate
  const skidPlate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.45), matSilverArmor);
  skidPlate.position.set(0, -0.14, 0.06);
  skidPlate.rotation.x = 0.35;
  bumperFrontGroup.add(skidPlate);

  // Twin Red Tow Hooks
  [-0.45, 0.45].forEach((hx) => {
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.018, 8, 16), matTowHook);
    hook.position.set(hx, -0.1, 0.2);
    bumperFrontGroup.add(hook);
  });

  bumperFrontGroup.position.set(0, 0.62, L / 2 + 0.08);
  registerPart(bumperFrontGroup, "Heavy-Duty Front Bumper & Skid Plate", "Armor", "High-approach angle steel offroad bumper with silver bash plate and rated red recovery points.", [0, -0.4, 1.5]);

  // 6. REAR BUMPER & TAIL LIGHT PODS
  const rearGroup = new THREE.Group();
  const bRear = new THREE.Mesh(createChamferBox(W + 0.04, 0.32, 0.3, 0.04), matTrimBlack);
  bRear.castShadow = true;
  rearGroup.add(bRear);

  // Vertical LED Tail Lights (Defender signature squares)
  [-0.78, 0.78].forEach((rx) => {
    for (let dy = 0.4; dy <= 0.7; dy += 0.15) {
      const tailCube = new THREE.Mesh(createChamferBox(0.12, 0.1, 0.05, 0.015), matTailLightRed);
      tailCube.position.set(rx, dy, -0.05);
      rearGroup.add(tailCube);
    }
  });

  rearGroup.position.set(0, 0.62, -L / 2 - 0.04);
  registerPart(rearGroup, "Rear Bumper & Vertical LED Lights", "Lighting", "Compact rear bumper with dual integrated vertical red LED jewel clusters.", [0, -0.4, -1.5]);

  // 7. CABIN, GREENHOUSE & ALPINE TINTED ROOF WINDOWS
  const cabinGroup = new THREE.Group();
  const cabinL = 2.45;

  // Pillars & Upper Frame
  const cabinFrameGeom = createChamferBox(W - 0.12, 0.72, cabinL, 0.04);
  const cabinFrame = new THREE.Mesh(cabinFrameGeom, matBodyGreen);
  cabinFrame.position.set(0, 0.36, 0);
  cabinFrame.castShadow = true;
  cabinGroup.add(cabinFrame);

  // Front Windshield (Angled)
  const windshield = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.28, 0.68), matGlass);
  windshield.rotation.x = -Math.PI / 2 + 0.45;
  windshield.position.set(0, 0.36, cabinL / 2 + 0.02);
  cabinGroup.add(windshield);

  // Side Windows (Left & Right)
  const sideWindowGeom = new THREE.PlaneGeometry(cabinL - 0.4, 0.48);
  const winL = new THREE.Mesh(sideWindowGeom, matGlass);
  winL.rotation.y = Math.PI / 2;
  winL.position.set(W / 2 - 0.05, 0.38, 0);
  const winR = new THREE.Mesh(sideWindowGeom, matGlass);
  winR.rotation.y = -Math.PI / 2;
  winR.position.set(-W / 2 + 0.05, 0.38, 0);
  cabinGroup.add(winL, winR);

  // Rear Cargo Window
  const rearWin = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, 0.5), matGlass);
  rearWin.rotation.y = Math.PI;
  rearWin.position.set(0, 0.38, -cabinL / 2 - 0.02);
  cabinGroup.add(rearWin);

  // Signature Alpine Roof Edge Windows (Curved upper skylights)
  [-1, 1].forEach((side) => {
    const alpineWin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8, 1, false, 0, Math.PI), matGlass);
    alpineWin.rotation.x = Math.PI / 2;
    alpineWin.rotation.z = side > 0 ? 0 : Math.PI;
    alpineWin.position.set(side * (W / 2 - 0.1), 0.72, -0.2);
    cabinGroup.add(alpineWin);
  });

  cabinGroup.position.set(0, 1.15, -0.35);
  registerPart(cabinGroup, "Cabin & Tinted Glazing", "Body", "Greenhouse with steep-raked windshield, flush pillars, and signature curved Alpine roof skylights.", [0, 0.6, 0]);

  // 8. CONTRAST FLOATING ROOF
  const roofGeom = createChamferBox(W - 0.05, 0.09, cabinL + 0.12, 0.03);
  const roofMesh = new THREE.Mesh(roofGeom, matRoofBlack);
  roofMesh.position.set(0, 1.94, -0.35);
  roofMesh.castShadow = true;
  registerPart(roofMesh, "Gloss Black Floating Roof", "Body", "Signature Santorini Black floating roof panel designed for expedition load carrying.", [0, 1.4, 0]);

  // 9. WIDE WHEEL ARCHES / FENDER FLARES
  const archGroup = new THREE.Group();
  const archSettings = [
    { x: W / 2 + 0.02, z: 1.32, isLeft: true },
    { x: -W / 2 - 0.02, z: 1.32, isLeft: false },
    { x: W / 2 + 0.02, z: -1.28, isLeft: true },
    { x: -W / 2 - 0.02, z: -1.28, isLeft: false }
  ];

  archSettings.forEach(({ x, z, isLeft }) => {
    // 3D Sculpted Arch using Tube Curve
    const curve = new THREE.EllipseCurve(0, 0, 0.58, 0.52, 0, Math.PI, false, 0);
    const points = curve.getPoints(16).map(p => new THREE.Vector3(0, p.y, p.x));
    const catmull = new THREE.CatmullRomCurve3(points);
    const archGeom = new THREE.TubeGeometry(catmull, 16, 0.06, 8, false);
    const archMesh = new THREE.Mesh(archGeom, matTrimBlack);
    archMesh.position.set(x, 0.55, z);
    archMesh.rotation.y = isLeft ? 0 : Math.PI;
    archMesh.castShadow = true;
    archGroup.add(archMesh);
  });
  archGroup.position.set(0, 0, 0);
  registerPart(archGroup, "Wide Fender Flare Arches", "Trim", "Molded scratch-resistant wide wheel arches allowing maximum axle articulation.", [0, 0.2, 0]);

  // 10. WHEELS & MUD-TERRAIN TIRES WITH DETAILED LUGS
  const wheelPositions = [
    { name: "Front Left Wheel", pos: [W / 2 + 0.04, 0.54, 1.32], isLeft: true, dir: [1.2, -0.2, 0.3] },
    { name: "Front Right Wheel", pos: [-W / 2 - 0.04, 0.54, 1.32], isLeft: false, dir: [-1.2, -0.2, 0.3] },
    { name: "Rear Left Wheel", pos: [W / 2 + 0.04, 0.54, -1.28], isLeft: true, dir: [1.2, -0.2, -0.3] },
    { name: "Rear Right Wheel", pos: [-W / 2 - 0.04, 0.54, -1.28], isLeft: false, dir: [-1.2, -0.2, -0.3] }
  ];

  wheelPositions.forEach(({ name, pos, isLeft, dir }) => {
    const singleWheelGroup = new THREE.Group();

    // Tire Base Donut
    const tireGeom = new THREE.CylinderGeometry(0.48, 0.48, 0.32, 28);
    const tire = new THREE.Mesh(tireGeom, matTireRubber);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    singleWheelGroup.add(tire);

    // Aggressive Offroad Mud Lugs (Tread Blocks)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
      const lug = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.06), matTireRubber);
      lug.position.set(0, Math.cos(a) * 0.49, Math.sin(a) * 0.49);
      lug.rotation.x = -a;
      singleWheelGroup.add(lug);
    }

    // Two-Tone Diamond Cut Alloy Rim
    const rimOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.33, 20), matRimSilverLip);
    rimOuter.rotation.z = Math.PI / 2;
    singleWheelGroup.add(rimOuter);

    const rimSpokes = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.335, 10), matRimAlloy);
    rimSpokes.rotation.z = Math.PI / 2;
    singleWheelGroup.add(rimSpokes);

    // Center Hub Cap with Defender Logo
    const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 16), matTrimBlack);
    hubCap.rotation.z = Math.PI / 2;
    singleWheelGroup.add(hubCap);

    // Brake Disc Rotor & Red Caliper
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 20), matBrakeRotor);
    rotor.rotation.z = Math.PI / 2;
    rotor.position.set(isLeft ? -0.06 : 0.06, 0, 0);
    singleWheelGroup.add(rotor);

    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.08), matBrakeCaliper);
    caliper.position.set(isLeft ? -0.06 : 0.06, 0.14, 0);
    singleWheelGroup.add(caliper);

    singleWheelGroup.position.set(pos[0], pos[1], pos[2]);
    registerPart(singleWheelGroup, name, "Wheels", "33-inch Mud-Terrain tire mounted on 20-inch Style 5095 Satin Dark Grey diamond-turned alloy wheels.", dir as [number, number, number]);
  });

  // 11. EXPEDITION TUBULAR ROOF RACK
  const rackGroup = new THREE.Group();
  const rackW = W - 0.2;
  const rackL = cabinL + 0.1;

  // Perimeter Tubular Rails
  const tubeMat = matTrimBlack;
  const outerRail = new THREE.Mesh(new THREE.BoxGeometry(rackW, 0.04, rackL), tubeMat);
  outerRail.position.set(0, 0.08, 0);
  rackGroup.add(outerRail);

  // Cross Slats
  for (let rz = -rackL / 2 + 0.2; rz <= rackL / 2 - 0.2; rz += 0.35) {
    const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, rackW - 0.08, 8), tubeMat);
    crossBar.rotation.z = Math.PI / 2;
    crossBar.position.set(0, 0.04, rz);
    rackGroup.add(crossBar);
  }

  // 4 Support Legs
  [-rackW / 2 + 0.1, rackW / 2 - 0.1].forEach((lx) => {
    [-rackL / 2 + 0.2, rackL / 2 - 0.2].forEach((lz) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8), tubeMat);
      leg.position.set(lx, -0.04, lz);
      rackGroup.add(leg);
    });
  });

  // High-Output LED Light Bar on Roof Rack Front
  const lightBar = new THREE.Mesh(createChamferBox(rackW - 0.3, 0.06, 0.06, 0.01), matTrimBlack);
  lightBar.position.set(0, 0.08, rackL / 2 + 0.05);
  for (let bx = -0.55; bx <= 0.55; bx += 0.11) {
    const ledCell = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.04), matLightbarLed);
    ledCell.position.set(bx, 0.08, rackL / 2 + 0.085);
    rackGroup.add(ledCell);
  }
  rackGroup.add(lightBar);

  rackGroup.position.set(0, 2.06, -0.35);
  registerPart(rackGroup, "Expedition Roof Rack & LED Lightbar", "Accessory", "High-strength lightweight aluminum roof platform with 300kg dynamic rating and integrated high-beam LED bar.", [0, 1.8, 0]);

  // 12. ORANGE MAXTRAX RECOVERY BOARDS
  const boardsGroup = new THREE.Group();
  [-0.22, 0.22].forEach((bx, idx) => {
    const board = new THREE.Mesh(createChamferBox(0.28, 0.04, 1.05, 0.015), matRecoveryBoard);
    board.position.set(bx, 0.02 * idx, 0);
    // Dimpled Cleats
    for (let cz = -0.42; cz <= 0.42; cz += 0.14) {
      const cleat1 = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.03, 6), matRecoveryBoard);
      cleat1.position.set(bx - 0.08, 0.04 + 0.02 * idx, cz);
      const cleat2 = cleat1.clone();
      cleat2.position.set(bx + 0.08, 0.04 + 0.02 * idx, cz);
      boardsGroup.add(cleat1, cleat2);
    }
    boardsGroup.add(board);
  });
  boardsGroup.position.set(0.42, 2.22, -0.35);
  registerPart(boardsGroup, "MaxTrax Recovery Traction Boards", "Accessory", "Engineering-grade nylon recovery tracks for instant vehicle recovery in sand, mud and snow.", [0.8, 2.0, 0]);

  // 13. RAISED AIR INTAKE / SNORKEL
  const snorkelGroup = new THREE.Group();
  const snorkelPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.04, 0.35, -0.1),
    new THREE.Vector3(0.04, 0.85, -0.4),
    new THREE.Vector3(0.02, 0.95, -0.42)
  ];
  const snorkelCurve = new THREE.CatmullRomCurve3(snorkelPoints);
  const snorkelPipe = new THREE.Mesh(new THREE.TubeGeometry(snorkelCurve, 16, 0.04, 8, false), matTrimBlack);
  snorkelGroup.add(snorkelPipe);

  // Top Ram Air Intake Head
  const snorkelHead = new THREE.Mesh(createChamferBox(0.12, 0.12, 0.16, 0.02), matTrimBlack);
  snorkelHead.position.set(0.02, 0.95, -0.38);
  snorkelGroup.add(snorkelHead);

  snorkelGroup.position.set(W / 2 + 0.05, 1.05, 0.9);
  registerPart(snorkelGroup, "Raised Air Intake (Snorkel)", "Accessory", "Engine air intake snorkel protecting engine from dust and enabling 900mm wading depth.", [1.5, 0.5, 0.5]);

  // 14. SIDE MOUNTED ACCESS LADDER
  const ladderGroup = new THREE.Group();
  const sideRailL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 8), matTrimBlack);
  sideRailL.position.set(0, 0, -0.16);
  const sideRailR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 8), matTrimBlack);
  sideRailR.position.set(0, 0, 0.16);
  ladderGroup.add(sideRailL, sideRailR);

  for (let ly = -0.35; ly <= 0.35; ly += 0.22) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), matTrimBlack);
    rung.rotation.x = Math.PI / 2;
    rung.position.set(0, ly, 0);
    ladderGroup.add(rung);
  }
  ladderGroup.position.set(-W / 2 - 0.08, 1.5, -0.85);
  registerPart(ladderGroup, "Deployable Side Access Ladder", "Accessory", "Two-stage lockable side ladder for easy roof rack equipment loading.", [-1.5, 0.5, -0.5]);

  // 15. REAR DOOR EXTERIOR MOUNTED FULL-SIZE SPARE TIRE
  const spareGroup = new THREE.Group();
  const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.3, 24), matTireRubber);
  spareTire.rotation.x = Math.PI / 2;
  spareTire.castShadow = true;
  spareGroup.add(spareTire);

  const spareRim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.31, 16), matRimAlloy);
  spareRim.rotation.x = Math.PI / 2;
  spareGroup.add(spareRim);

  const spareCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.15), matTrimBlack);
  spareCarrier.position.set(0, 0, -0.15);
  spareGroup.add(spareCarrier);

  spareGroup.position.set(0, 1.15, -L / 2 - 0.22);
  registerPart(spareGroup, "Exterior Full-Size Spare Wheel", "Wheels", "Heavy-duty rear tailgate-mounted matching alloy spare wheel with locking lug bracket.", [0, 0.2, -1.8]);

  // 16. WING MIRRORS & DOOR HANDLES
  const detailsGroup = new THREE.Group();
  // Mirrors
  [-1, 1].forEach((side) => {
    const mirrorStem = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.06), matTrimBlack);
    mirrorStem.position.set(side * (W / 2 + 0.06), 1.38, 0.82);
    const mirrorBody = new THREE.Mesh(createChamferBox(0.2, 0.14, 0.12, 0.03), matRoofBlack);
    mirrorBody.position.set(side * (W / 2 + 0.16), 1.4, 0.82);
    const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.11), matRimAlloy);
    mirrorGlass.rotation.y = side > 0 ? Math.PI : 0;
    mirrorGlass.position.set(side * (W / 2 + 0.16), 1.4, 0.75);
    detailsGroup.add(mirrorStem, mirrorBody, mirrorGlass);
  });

  // Flush Door Handles
  [-1, 1].forEach((side) => {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.18), matTrimBlack);
    handle.position.set(side * (W / 2 + 0.02), 1.12, 0.1);
    detailsGroup.add(handle);
  });

  // Side Decal Badges
  const decalL = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.35), matDecalAgility);
  decalL.rotation.y = Math.PI / 2;
  decalL.position.set(W / 2 + 0.025, 0.95, 0.1);
  const decalR = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.35), matDecalAgility);
  decalR.rotation.y = -Math.PI / 2;
  decalR.position.set(-W / 2 - 0.025, 0.95, 0.1);
  detailsGroup.add(decalL, decalR);

  detailsGroup.position.set(0, 0, 0);
  registerPart(detailsGroup, "Aero Mirrors & Exterior Badging", "Trim", "Aerodynamic high-visibility mirrors with integrated blind spot monitors and flush handles.", [0, 0, 0]);
}

// --- Interaction & Animation ---
function onPointerMove(event: PointerEvent) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick() {
  if (hoveredPart) {
    selectedPart = hoveredPart;
    const inspector = document.getElementById('inspector-panel')!;
    inspector.style.display = 'block';

    document.getElementById('part-name')!.innerText = selectedPart.userData.name || 'Component';
    document.getElementById('part-category')!.innerText = selectedPart.userData.category || 'Standard Part';
    document.getElementById('part-info')!.innerText = selectedPart.userData.info || 'No description available.';

    highlightMesh.setFromObject(selectedPart);
    highlightMesh.visible = true;
  } else {
    selectedPart = null;
    highlightMesh.visible = false;
    document.getElementById('inspector-panel')!.style.display = 'none';
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupUI() {
  document.getElementById('btn-view-front')?.addEventListener('click', () => gsapMoveCamera(0, 1.8, 8));
  document.getElementById('btn-view-side')?.addEventListener('click', () => gsapMoveCamera(8.5, 1.8, 0));
  document.getElementById('btn-view-iso')?.addEventListener('click', () => gsapMoveCamera(7.5, 4.5, 7.5));
  document.getElementById('btn-view-ref')?.addEventListener('click', () => gsapMoveCamera(-6.8, 3.6, 6.8));

  const btnAutoRotate = document.getElementById('btn-auto-rotate')!;
  btnAutoRotate.addEventListener('click', () => {
    autoRotate = !autoRotate;
    if (autoRotate) btnAutoRotate.classList.add('active');
    else btnAutoRotate.classList.remove('active');
  });

  const explodeSlider = document.getElementById('explode-slider') as HTMLInputElement;
  const explodeValText = document.getElementById('explode-val')!;
  explodeSlider.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    explodeValText.innerText = val.toString();
    explodeValue = (val / 100.0) * 2.2;
    updateExplode();
  });

  document.getElementById('env-select')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (val === 'studio') {
      scene.background = new THREE.Color(0x121417);
      scene.fog = new THREE.Fog(0x121417, 20, 90);
      mainLight.color.setHex(0xfffaed);
      mainLight.intensity = 2.2;
      ambientLight.intensity = 0.65;
      fillLight.color.setHex(0x7ea2cc);
    } else if (val === 'dusk') {
      scene.background = new THREE.Color(0x2d1810);
      scene.fog = new THREE.Fog(0x2d1810, 12, 70);
      mainLight.color.setHex(0xff8833);
      mainLight.intensity = 2.8;
      ambientLight.intensity = 0.4;
      fillLight.color.setHex(0x4a2a40);
    } else if (val === 'night') {
      scene.background = new THREE.Color(0x06080d);
      scene.fog = new THREE.Fog(0x06080d, 8, 45);
      mainLight.color.setHex(0x3366ff);
      mainLight.intensity = 0.8;
      ambientLight.intensity = 0.15;
      fillLight.color.setHex(0x111c33);
    }
  });

  const chkGrid = document.getElementById('chk-grid') as HTMLInputElement;
  chkGrid?.addEventListener('change', () => {
    gridHelper.visible = chkGrid.checked;
  });

  const btnToggleRef = document.getElementById('btn-toggle-ref')!;
  const refContent = document.getElementById('ref-content')!;
  btnToggleRef?.addEventListener('click', () => {
    refContent.classList.toggle('collapsed');
    btnToggleRef.innerText = refContent.classList.contains('collapsed') ? '+' : '−';
  });
}

function updateExplode() {
  parts.forEach((part) => {
    const base = part.userData.basePos as THREE.Vector3;
    const dir = part.userData.explodeDir as THREE.Vector3;
    if (base && dir) {
      part.position.copy(base).add(dir.clone().multiplyScalar(explodeValue));
    }
  });
  if (selectedPart && highlightMesh.visible) {
    highlightMesh.setFromObject(selectedPart);
  }
}

function gsapMoveCamera(x: number, y: number, z: number) {
  const start = camera.position.clone();
  const end = new THREE.Vector3(x, y, z);
  let alpha = 0;
  const interval = setInterval(() => {
    alpha += 0.06;
    if (alpha >= 1) {
      alpha = 1;
      clearInterval(interval);
    }
    camera.position.lerpVectors(start, end, alpha);
    controls.update();
  }, 16);
}

function animate() {
  requestAnimationFrame(animate);

  if (autoRotate) {
    carGroup.rotation.y += 0.004;
  }

  controls.update();

  // Hover detection
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(parts, true);

  if (intersects.length > 0) {
    let topObj: THREE.Object3D | null = intersects[0].object;
    while (topObj && !topObj.userData.name && topObj.parent !== carGroup && topObj.parent !== scene) {
      topObj = topObj.parent;
    }
    hoveredPart = topObj;
    document.body.style.cursor = 'pointer';
  } else {
    hoveredPart = null;
    document.body.style.cursor = 'default';
  }

  renderer.render(scene, camera);
}
