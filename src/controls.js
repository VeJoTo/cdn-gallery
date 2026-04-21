import * as THREE from "three";

const MOVE_SPEED = 4.2;
const POINTER_MOVE_SPEED = 6.2;
const PLAYER_HEIGHT = 1.72;
const LOOK_SENSITIVITY = 0.0022;
const MAX_PITCH = Math.PI / 2 - 0.05;

export function createFirstPersonController({ canvas, camera }) {
  const yaw = new THREE.Object3D();
  const pitch = new THREE.Object3D();
  yaw.position.set(0, PLAYER_HEIGHT, 7.5);
  pitch.add(camera);
  yaw.add(pitch);

  const movement = {
    forward: false,
    backward: false,
    left: false,
    right: false
  };

  let pointerForward = false;
  let isLocked = false;
  let isEnabled = true;

  function resetMovement() {
    movement.forward = false;
    movement.backward = false;
    movement.left = false;
    movement.right = false;
    pointerForward = false;
  }

  function onMouseMove(event) {
    if (!isLocked || !isEnabled) {
      return;
    }

    yaw.rotation.y -= event.movementX * LOOK_SENSITIVITY;
    pitch.rotation.x -= event.movementY * LOOK_SENSITIVITY;
    pitch.rotation.x = THREE.MathUtils.clamp(pitch.rotation.x, -MAX_PITCH, MAX_PITCH);
  }

  function onPointerLockChange() {
    isLocked = document.pointerLockElement === canvas;

    if (!isLocked) {
      resetMovement();
    }
  }

  function onKeyChange(event, pressed) {
    if (!isEnabled) {
      return;
    }

    switch (event.code) {
      case "KeyW":
        movement.forward = pressed;
        break;
      case "KeyS":
        movement.backward = pressed;
        break;
      case "KeyA":
        movement.left = pressed;
        break;
      case "KeyD":
        movement.right = pressed;
        break;
      default:
        break;
    }
  }

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  window.addEventListener("keydown", (event) => onKeyChange(event, true));
  window.addEventListener("keyup", (event) => onKeyChange(event, false));
  window.addEventListener("blur", resetMovement);

  function update(delta, bounds) {
    if (!isLocked || !isEnabled) {
      return;
    }

    const forwardAmount = Number(movement.forward || pointerForward) - Number(movement.backward);
    const strafeAmount = Number(movement.right) - Number(movement.left);
    const direction = new THREE.Vector3(strafeAmount, 0, -forwardAmount);

    if (direction.lengthSq() === 0) {
      return;
    }

    direction.normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yaw.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(yaw.quaternion);
    right.y = 0;
    right.normalize();

    const speed = pointerForward && !movement.backward ? POINTER_MOVE_SPEED : MOVE_SPEED;
    yaw.position.addScaledVector(forward, -direction.z * speed * delta);
    yaw.position.addScaledVector(right, direction.x * MOVE_SPEED * delta);

    yaw.position.x = THREE.MathUtils.clamp(yaw.position.x, bounds.minX, bounds.maxX);
    yaw.position.z = THREE.MathUtils.clamp(yaw.position.z, bounds.minZ, bounds.maxZ);
    yaw.position.y = PLAYER_HEIGHT;
  }

  function lock() {
    canvas.requestPointerLock();
  }

  function unlock() {
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  function setPointerForward(active) {
    pointerForward = active && isEnabled;
  }

  function setEnabled(active) {
    isEnabled = active;

    if (!active) {
      resetMovement();
    }
  }

  function getPose() {
    return {
      position: yaw.position.clone(),
      yaw: yaw.rotation.y,
      pitch: pitch.rotation.x
    };
  }

  function setPose({ position, yaw: nextYaw, pitch: nextPitch }) {
    yaw.position.copy(position);
    yaw.position.y = PLAYER_HEIGHT;
    yaw.rotation.y = nextYaw;
    pitch.rotation.x = THREE.MathUtils.clamp(nextPitch, -MAX_PITCH, MAX_PITCH);
  }

  function getLookPose(position, target) {
    const direction = target.clone().sub(position);
    const horizontalLength = Math.max(0.0001, Math.hypot(direction.x, direction.z));

    return {
      yaw: Math.atan2(-direction.x, -direction.z),
      pitch: THREE.MathUtils.clamp(Math.atan2(direction.y, horizontalLength), -MAX_PITCH, MAX_PITCH)
    };
  }

  return {
    player: yaw,
    update,
    lock,
    unlock,
    setEnabled,
    setPointerForward,
    getPose,
    setPose,
    getLookPose,
    isLocked: () => isLocked,
    resetMovement
  };
}
