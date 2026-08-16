import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Global Variables ---
let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let carGroup: THREE.Group;
let parts: THREE.Object3D[] = [];
let explodeValue = 0;
let autoRotate = true;

// Environment lighting
let mainLight: THREE.DirectionalLight, fillLight: THREE.DirectionalLight, ambientLight: THREE.AmbientLight;
let gridHelper: THREE.GridHelper;

// Raycaster for interactions
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredPart: THREE.Object3D | null = null;
let selectedPart: THREE.Object3D | null = null;

// Materials
const matBody = new THREE.MeshStandardMaterial({ color: 0x3a6344, roughness: 0.3, metalness: 0.2 });
const matBlackTrim = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.1 });
const matGlossBlack = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1, metalness: 0.8 });
const matGlass = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.8 });
const matMetal = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.8 });
const matTire = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9, metalness: 0.0 });
const matLightWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
const matLightRed = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const matHighlight = new THREE.MeshBasicMaterial({ color: 0x40e0d0, wireframe: true, transparent: true, opacity: 0.5 });

// Highlight mesh
let highlightMesh: THREE.Mesh;

// --- Canvas Textures ---
function createTextTexture(text: string, bgColor: string, textColor: string, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = textColor;
  ctx.font = `bold ${height * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

const texRapid = createTextTexture('RAPID', '#000000', '#ffffff', 256, 64);
const matRapid = new THREE.MeshStandardMaterial({ map: texRapid, roughness: 0.5 });

const texAgility = createTextTexture('AGILITY', '#3a6344', '#ffffff', 512, 128);
const matAgility = new THREE.MeshStandardMaterial({ map: texAgility, roughness: 0.4 });

const texBoard = createTextTexture('||||||||||', '#ff5500', '#aa2200', 128, 512);
const matBoard = new THREE.MeshStandardMaterial({ map: texBoard, roughness: 0.8 });

init();
animate();

function init() {
  const container = document.getElementById('canvas-container')!;
  
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);
  scene.fog = new THREE.Fog(0x111111, 20, 100);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(10, 8, 12);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0);

  // Lighting
  ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
  mainLight.position.set(10, 20, 10);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.camera.left = -10;
  mainLight.shadow.camera.right = 10;
  mainLight.shadow.camera.top = 10;
  mainLight.shadow.camera.bottom = -10;
  mainLight.shadow.bias = -0.001;
  scene.add(mainLight);

  fillLight = new THREE.DirectionalLight(0x88bbff, 0.5);
  fillLight.position.set(-10, 5, -10);
  scene.add(fillLight);

  // Ground Grid
  gridHelper = new THREE.GridHelper(40, 40, 0x444444, 0x222222);
  gridHelper.position.y = -0.01;
  scene.add(gridHelper);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Highlight Box
  highlightMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), matHighlight);
  highlightMesh.visible = false;
  scene.add(highlightMesh);

  // Build Car
  carGroup = new THREE.Group();
  scene.add(carGroup);
  buildCar();

  // Events
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('click', onClick);

  setupUI();
}

// --- Car Building ---
function addPart(
  geometry: THREE.BufferGeometry, 
  material: THREE.Material | THREE.Material[], 
  name: string, 
  category: string, 
  info: string,
  pos: [number, number, number], 
  explodeDir: [number, number, number],
  castShadow = true
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  
  mesh.userData = {
    name,
    category,
    info,
    basePos: new THREE.Vector3(pos[0], pos[1], pos[2]),
    explodeDir: new THREE.Vector3(explodeDir[0], explodeDir[1], explodeDir[2])
  };
  
  carGroup.add(mesh);
  parts.push(mesh);
  return mesh;
}

function buildCar() {
  const w = 2.0;  // width
  const l = 5.0;  // length
  const h1 = 0.8; // lower body height
  const h2 = 0.7; // cabin height

  // Chassis / Lower Frame
  addPart(new THREE.BoxGeometry(w - 0.1, 0.2, l - 0.2), matBlackTrim, "Chassis Base", "Frame", "Heavy-duty steel ladder frame.", [0, 0.4, 0], [0, -1, 0]);

  // Main Body Lower
  addPart(new THREE.BoxGeometry(w, h1, l), matBody, "Main Body", "Body", "Grass green painted lower body panels.", [0, 0.9, 0], [0, 0, 0]);

  // Front Hood Bulge
  addPart(new THREE.BoxGeometry(w - 0.4, 0.1, 1.2), matBody, "Hood Bulge", "Body", "Raised hood for larger engine clearance.", [0, 1.35, 1.3], [0, 1, 1]);

  // Hood Vent Panel
  addPart(new THREE.BoxGeometry(w - 0.8, 0.02, 0.4), matRapid, "Hood Vent Panel", "Trim", "Black plastic vent with RAPID badge.", [0, 1.41, 1.5], [0, 1, 1.5]);

  // Cabin
  const cabinL = 3.2;
  addPart(new THREE.BoxGeometry(w - 0.05, h2, cabinL), matBody, "Cabin Structure", "Body", "Passenger cabin frame.", [0, 1.65, -0.4], [0, 1, 0]);

  // Windows
  addPart(new THREE.BoxGeometry(w, h2 - 0.1, cabinL - 0.2), matGlass, "Windows", "Glass", "Reflective tinted privacy glass.", [0, 1.65, -0.4], [0, 1, 0], false);

  // Roof
  addPart(new THREE.BoxGeometry(w + 0.05, 0.1, cabinL + 0.1), matGlossBlack, "Floating Roof", "Body", "Gloss black signature floating roof.", [0, 2.05, -0.4], [0, 1.5, 0]);

  // Bumpers
  addPart(new THREE.BoxGeometry(w + 0.1, 0.3, 0.4), matBlackTrim, "Front Bumper", "Armor", "Heavy-duty front off-road bumper.", [0, 0.65, 2.6], [0, -0.5, 1]);
  addPart(new THREE.BoxGeometry(w + 0.1, 0.3, 0.3), matBlackTrim, "Rear Bumper", "Armor", "Heavy-duty rear bumper.", [0, 0.65, -2.6], [0, -0.5, -1]);

  // Wheel Arches (Flares)
  const flareGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.2, 16, 1, false, 0, Math.PI);
  const positions: [number, number, number][] = [
    [1.05, 0.8, 1.6], [-1.05, 0.8, 1.6],
    [1.05, 0.8, -1.6], [-1.05, 0.8, -1.6]
  ];
  positions.forEach((pos, i) => {
    const isLeft = pos[0] > 0;
    const mesh = addPart(flareGeo, matBlackTrim, `Wheel Arch ${i+1}`, "Trim", "Black plastic extended wheel arches.", pos, [isLeft ? 1 : -1, 0.5, 0]);
    mesh.rotation.z = Math.PI / 2;
  });

  // Wheels & Tires
  const tireGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.3, 24);
  const rimGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.32, 12);
  positions.forEach((pos, i) => {
    const isLeft = pos[0] > 0;
    const x = isLeft ? 1.0 : -1.0;
    const dirX = isLeft ? 1 : -1;
    
    const tire = addPart(tireGeo, matTire, `Off-Road Tire ${i+1}`, "Wheel", "All-terrain chunky tire.", [x, 0.45, pos[2]], [dirX, -0.5, 0]);
    tire.rotation.z = Math.PI / 2;

    const rim = addPart(rimGeo, matGlossBlack, `Rim ${i+1}`, "Wheel", "Multi-spoke black alloy rim.", [x, 0.45, pos[2]], [dirX*1.2, -0.5, 0]);
    rim.rotation.z = Math.PI / 2;
  });

  // Side Decals (AGILITY)
  const decalGeo = new THREE.PlaneGeometry(2.0, 0.5);
  const decalL = addPart(decalGeo, matAgility, "Side Decal (Left)", "Trim", "AGILITY signature graphics.", [1.01, 1.0, -0.4], [1, 0, 0], false);
  decalL.rotation.y = Math.PI / 2;
  const decalR = addPart(decalGeo, matAgility, "Side Decal (Right)", "Trim", "AGILITY signature graphics.", [-1.01, 1.0, -0.4], [-1, 0, 0], false);
  decalR.rotation.y = -Math.PI / 2;

  // Lights
  addPart(new THREE.BoxGeometry(0.4, 0.2, 0.1), matLightWhite, "Front Left Light", "Light", "LED Halo DRL with projector.", [0.7, 1.1, 2.51], [0.5, 0, 1], false);
  addPart(new THREE.BoxGeometry(0.4, 0.2, 0.1), matLightWhite, "Front Right Light", "Light", "LED Halo DRL with projector.", [-0.7, 1.1, 2.51], [-0.5, 0, 1], false);
  addPart(new THREE.BoxGeometry(0.2, 0.4, 0.1), matLightRed, "Rear Left Light", "Light", "Square block LED tail light.", [0.8, 1.0, -2.51], [0.5, 0, -1], false);
  addPart(new THREE.BoxGeometry(0.2, 0.4, 0.1), matLightRed, "Rear Right Light", "Light", "Square block LED tail light.", [-0.8, 1.0, -2.51], [-0.5, 0, -1], false);

  // Roof Rack (Simple representation)
  addPart(new THREE.BoxGeometry(w, 0.05, cabinL), matMetal, "Roof Rack Frame", "Accessory", "Aluminum expedition roof rack.", [0, 2.15, -0.4], [0, 2, 0]);

  // Orange Traction Boards
  for(let i=0; i<3; i++) {
    addPart(new THREE.BoxGeometry(0.4, 0.05, 1.2), matBoard, `Traction Board ${i+1}`, "Accessory", "Orange sand/mud recovery boards.", [-0.6 + i*0.6, 2.2, -0.5], [0, 2.5, 0]);
  }

  // Side Ladder
  addPart(new THREE.BoxGeometry(0.1, 1.2, 0.4), matBlackTrim, "Side Ladder", "Accessory", "Folding side access ladder.", [-1.05, 1.5, -1.5], [-1.5, 1, 0]);

  // Mirrors
  addPart(new THREE.BoxGeometry(0.2, 0.15, 0.15), matGlossBlack, "Left Mirror", "Trim", "Side rear-view mirror.", [1.1, 1.4, 0.6], [1.5, 0, 0]);
  addPart(new THREE.BoxGeometry(0.2, 0.15, 0.15), matGlossBlack, "Right Mirror", "Trim", "Side rear-view mirror.", [-1.1, 1.4, 0.6], [-1.5, 0, 0]);

  // Door Handles
  addPart(new THREE.BoxGeometry(0.05, 0.05, 0.15), matBlackTrim, "Door Handle L1", "Trim", "Flush door handle.", [1.02, 1.2, 0.2], [1, 0, 0]);
  addPart(new THREE.BoxGeometry(0.05, 0.05, 0.15), matBlackTrim, "Door Handle L2", "Trim", "Flush door handle.", [1.02, 1.2, -1.0], [1, 0, 0]);
  addPart(new THREE.BoxGeometry(0.05, 0.05, 0.15), matBlackTrim, "Door Handle R1", "Trim", "Flush door handle.", [-1.02, 1.2, 0.2], [-1, 0, 0]);
  addPart(new THREE.BoxGeometry(0.05, 0.05, 0.15), matBlackTrim, "Door Handle R2", "Trim", "Flush door handle.", [-1.02, 1.2, -1.0], [-1, 0, 0]);
}

// --- Interaction & UI ---
function onPointerMove(event: PointerEvent) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onClick() {
  if (hoveredPart) {
    selectedPart = hoveredPart;
    const inspector = document.getElementById('inspector-panel')!;
    inspector.style.display = 'block';
    
    document.getElementById('part-name')!.innerText = selectedPart.userData.name;
    document.getElementById('part-category')!.innerText = selectedPart.userData.category;
    document.getElementById('part-info')!.innerText = selectedPart.userData.info;

    // Optional: bounce effect
    const base = selectedPart.userData.basePos as THREE.Vector3;
    const dir = selectedPart.userData.explodeDir as THREE.Vector3;
    selectedPart.position.copy(base).add(dir.clone().multiplyScalar(explodeValue)).add(new THREE.Vector3(0, 0.2, 0));
    setTimeout(() => {
      if(selectedPart) {
        selectedPart.position.copy(base).add(dir.clone().multiplyScalar(explodeValue));
      }
    }, 150);
  } else {
    selectedPart = null;
    document.getElementById('inspector-panel')!.style.display = 'none';
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupUI() {
  document.getElementById('btn-view-front')?.addEventListener('click', () => {
    gsapMoveCamera(0, 2, 10);
  });
  document.getElementById('btn-view-side')?.addEventListener('click', () => {
    gsapMoveCamera(10, 2, 0);
  });
  document.getElementById('btn-view-iso')?.addEventListener('click', () => {
    gsapMoveCamera(8, 6, 8);
  });
  document.getElementById('btn-view-ref')?.addEventListener('click', () => {
    gsapMoveCamera(-7, 4, 7); // match typical ref angle
  });
  
  const btnAutoRotate = document.getElementById('btn-auto-rotate')!;
  btnAutoRotate.addEventListener('click', () => {
    autoRotate = !autoRotate;
    if(autoRotate) btnAutoRotate.classList.add('active');
    else btnAutoRotate.classList.remove('active');
  });

  const explodeSlider = document.getElementById('explode-slider') as HTMLInputElement;
  const explodeValText = document.getElementById('explode-val')!;
  explodeSlider.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    explodeValText.innerText = val.toString();
    explodeValue = val / 100.0 * 3.0; // max distance multiplier
    updateExplode();
  });

  document.getElementById('env-select')?.addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    if (val === 'studio') {
      scene.background = new THREE.Color(0x111111);
      scene.fog = new THREE.Fog(0x111111, 20, 100);
      mainLight.color.setHex(0xffffff);
      mainLight.intensity = 1.5;
      ambientLight.intensity = 0.4;
      fillLight.color.setHex(0x88bbff);
    } else if (val === 'dusk') {
      scene.background = new THREE.Color(0x332211);
      scene.fog = new THREE.Fog(0x332211, 10, 80);
      mainLight.color.setHex(0xffaa55);
      mainLight.intensity = 2.0;
      ambientLight.intensity = 0.2;
      fillLight.color.setHex(0x443355);
    } else if (val === 'night') {
      scene.background = new THREE.Color(0x020205);
      scene.fog = new THREE.Fog(0x020205, 5, 50);
      mainLight.color.setHex(0x3355ff);
      mainLight.intensity = 0.5;
      ambientLight.intensity = 0.05;
      fillLight.color.setHex(0x111122);
    }
  });

  const chkGrid = document.getElementById('chk-grid') as HTMLInputElement;
  chkGrid.addEventListener('change', () => {
    gridHelper.visible = chkGrid.checked;
  });

  const btnToggleRef = document.getElementById('btn-toggle-ref')!;
  const refContent = document.getElementById('ref-content')!;
  btnToggleRef.addEventListener('click', () => {
    refContent.classList.toggle('collapsed');
    btnToggleRef.innerText = refContent.classList.contains('collapsed') ? '+' : '−';
  });
}

function updateExplode() {
  parts.forEach(part => {
    const base = part.userData.basePos as THREE.Vector3;
    const dir = part.userData.explodeDir as THREE.Vector3;
    part.position.copy(base).add(dir.clone().multiplyScalar(explodeValue));
  });
  if (selectedPart) {
    const base = selectedPart.userData.basePos as THREE.Vector3;
    const dir = selectedPart.userData.explodeDir as THREE.Vector3;
    highlightMesh.position.copy(base).add(dir.clone().multiplyScalar(explodeValue));
  }
}

function gsapMoveCamera(x: number, y: number, z: number) {
  // Simple interpolation without adding external library
  const start = camera.position.clone();
  const end = new THREE.Vector3(x, y, z);
  let alpha = 0;
  const interval = setInterval(() => {
    alpha += 0.05;
    if(alpha >= 1) {
      alpha = 1;
      clearInterval(interval);
    }
    camera.position.lerpVectors(start, end, alpha);
  }, 16);
}

// --- Render Loop ---
function animate() {
  requestAnimationFrame(animate);

  if (autoRotate) {
    carGroup.rotation.y += 0.005;
  }

  controls.update();

  // Raycasting
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(parts, false);

  if (intersects.length > 0) {
    hoveredPart = intersects[0].object;
    document.body.style.cursor = 'pointer';
    
    // Position highlight box
    highlightMesh.visible = true;
    highlightMesh.position.copy(hoveredPart.position);
    highlightMesh.rotation.copy(hoveredPart.rotation);
    if(hoveredPart instanceof THREE.Mesh) {
      if(!highlightMesh.geometry) {} // Keep TS happy
      const geo = hoveredPart.geometry as THREE.BufferGeometry;
      geo.computeBoundingBox();
      const box = geo.boundingBox!;
      const size = new THREE.Vector3();
      box.getSize(size);
      // scale a bit larger
      highlightMesh.scale.copy(size).multiplyScalar(1.05);
    }
  } else {
    hoveredPart = null;
    document.body.style.cursor = 'default';
    if (!selectedPart) {
      highlightMesh.visible = false;
    } else {
      highlightMesh.visible = true;
      highlightMesh.position.copy(selectedPart.position);
      highlightMesh.rotation.copy(selectedPart.rotation);
      const geo = (selectedPart as THREE.Mesh).geometry as THREE.BufferGeometry;
      geo.computeBoundingBox();
      const box = geo.boundingBox!;
      const size = new THREE.Vector3();
      box.getSize(size);
      highlightMesh.scale.copy(size).multiplyScalar(1.05);
    }
  }

  renderer.render(scene, camera);
}
