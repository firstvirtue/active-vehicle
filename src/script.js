import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import * as CANNON from 'cannon-es'

THREE.ColorManagement.enabled = false

/**
 * Base
 */
// Debug
const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

const world = new CANNON.World()
world.gravity.set(0, -10, 0)

/**
 * Models
 */
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('/draco/')

const gltfLoader = new GLTFLoader()
gltfLoader.setDRACOLoader(dracoLoader)

let mixer = null
let chassisBody = null
let vehicle = null
let floorBody = null

gltfLoader.load(
    // '/models/Fox/glTF/Fox.gltf',
    '/models/drifter.glb',
    (gltf) =>
    {
        
        vehicle = gltf.scene

        gltf.scene.scale.set(0.0025, 0.0025, 0.0025)
        console.log(gltf.scene)
        scene.add(gltf.scene)

        const shapes = gltf.scene

        const chassisShape = new CANNON.Box(new CANNON.Vec3(0.0660, 0.0660, 0.0660))
        chassisBody = new CANNON.Body({ 
            mass: 1,
            shape: chassisShape,
            position: new CANNON.Vec3(0, 5, 0)
        })
        
        const floorShape = new CANNON.Plane()
        floorBody = new CANNON.Body({
            mass: 0,
            shape: floorShape,
        })

        floorBody.quaternion.setFromAxisAngle(
            new CANNON.Vec3(-1, 0, 0),
            Math.PI * 0.5
        )

        world.addBody(chassisBody)
        world.addBody(floorBody)


        // Animation
        mixer = new THREE.AnimationMixer(gltf.scene)
        const action = mixer.clipAction(gltf.animations[0])
        action.play()
    }
)

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: '#444444',
        metalness: 0,
        roughness: 0.5
    })
)
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(- 5, 5, 0)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(2, 2, 2)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target.set(0, 0.75, 0)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.outputColorSpace = THREE.LinearSRGBColorSpace
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Model animation
    if(mixer)
    {
        mixer.update(deltaTime)
    }

    world.step(deltaTime)

    if(vehicle) {
        
        // updateMovement(chassisBody, new CANNON.Vec3(10, 0 ,0))
        vehicle.position.copy(chassisBody?.position)
    }
    
    console.log(chassisBody?.position)

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()

function updateMovement(body, target) {
    var direction = new CANNON.Vec3();
    target.vsub(body.position, direction);
    direction.y = 0;
    direction.normalize();
    
    // Get the rotation between the forward vector and the direction vector
    var forward = new CANNON.Vec3(0,0,1);
    body.quaternion.setFromVectors(forward, direction);
    
    // Multiply direction by 10 and store in body.velocity
    var fixedSpeed = 10;
    direction.mult(fixedSpeed, body.velocity);
}