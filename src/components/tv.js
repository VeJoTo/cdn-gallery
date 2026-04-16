import * as THREE from "three";

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const hw = w / 2,
    hh = h / 2;
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0, false);
  s.lineTo(hw, hh - r);
  s.absarc(hw - r, hh - r, r, 0, Math.PI / 2, false);
  s.lineTo(-hw + r, hh);
  s.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-hw, -hh + r);
  s.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

export function buildTV() {
  const group = new THREE.Group();
  group.position.set(3.49, 2.65, 0);
  group.rotation.y = -Math.PI / 2;

  // Felles hjørneradius for alle synlege element
  const R = 0.06;

  // Kropp – stikk ut frå veggen inn i rommet (z=0 er veggsida, z=0.13 er fronten)
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRectShape(1.98, 1.35, 0.02), {
      depth: 0.13,
      bevelEnabled: false,
    }),

    new THREE.MeshStandardMaterial({
      color: 0x141414,
      metalness: 0.8,
      roughness: 0.15,
    }),
  );

  group.add(body);

  // Smal neonstripe – rosa/lilla ring rundt skjermen
  const stripeShape = roundedRectShape(1.95, 1.11, R);
  stripeShape.holes.push(roundedRectShape(1.94, 1.1, R));
  const stripe = new THREE.Mesh(
    new THREE.ShapeGeometry(stripeShape),
    new THREE.MeshStandardMaterial({
      color: 0x6a0daa,
      emissive: 0x6a0daa,
      emissiveIntensity: 1.8,
      side: THREE.DoubleSide,
    }),
  );
  stripe.position.z = 0.135;
  stripe.position.y = 0.1; // <--- Legg til denne så den følger skjermen!

  group.add(stripe);

  // Skjerm – same radius som stripe-hullet
  const screen = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRectShape(1.93, 1.09, R)),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  screen.position.z = 0.136;
  screen.position.y = 0.1;
  group.add(screen);

  group.userData = {
    clickable: true,
    hotspot: "tv",
    screenMesh: screen,
  };

  // Knapp-materiale (Hologram-utseende)
  const buttonMat = new THREE.MeshStandardMaterial({
    color: 0x00fa9a, //
    emissive: 0x00fa9a,
    emissiveIntensity: 5.0, // Kraftig lys
    transparent: true, // Gjør den gjennomsiktig
    opacity: 0.5, // 60% synlig
  });
  // Halo material – slightly larger glowing disc behind each icon
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0x00f2ff,
    transparent: true,
    opacity: 0.05,
    side: THREE.DoubleSide,
  });
  const haloGeo = new THREE.CircleGeometry(0.07, 24);
  function addHalo(parent, x = 0, y = 0, z = -0.005) {
    const halo = new THREE.Mesh(haloGeo, haloMat.clone());
    halo.position.set(x, y, z);
    parent.add(halo);
  }

  // 2. Lim inn hologram-koden her:
  const hologramBtn = new THREE.Group();

  // PAUSE-IKON (To stolper)
  const pauseGroup = new THREE.Group();
  const barGeom = new THREE.BoxGeometry(0.025, 0.1, 0.01);
  const leftBar = new THREE.Mesh(barGeom, buttonMat);
  const rightBar = new THREE.Mesh(barGeom, buttonMat);
  leftBar.position.x = -0.035;
  rightBar.position.x = 0.035;
  pauseGroup.add(leftBar, rightBar);
  pauseGroup.name = "pauseIcon"; // Viktig navn!

  // PLAY-IKON (Trekant)
  // Alternativ metode (Trekant som alltid er flat mot deg)
  const triangleShape = new THREE.Shape();
  triangleShape.moveTo(-0.04, -0.05); // Bunn venstre
  triangleShape.lineTo(-0.04, 0.05); // Topp venstre
  triangleShape.lineTo(0.06, 0); // Spiss høyre

  triangleShape.closePath();

  const playGeom = new THREE.ShapeGeometry(triangleShape);
  const playIcon = new THREE.Mesh(playGeom, buttonMat);

  // Med ShapeGeometry trenger du sannsynligvis ingen rotasjon!
  playIcon.rotation.set(0, 0, 0);

  playIcon.name = "playIcon"; // Viktig navn!
  playIcon.visible = false; // Skjult som standard (siden videoen starter som "play")

  hologramBtn.add(pauseGroup, playIcon);
  addHalo(hologramBtn, 0, 0); // behind play/pause
  hologramBtn.position.set(0, -0.55, 0.2);

  // Legg til klikk-logikk på begge
  [leftBar, rightBar, playIcon].forEach((obj) => {
    obj.userData = { clickable: true, action: "toggleTV", hotspot: "tv-power" };
  });

  // 1. Lag pil-formen (trekant)
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(-0.03, -0.04);
  arrowShape.lineTo(-0.03, 0.04);
  arrowShape.lineTo(0.05, 0);

  arrowShape.closePath();
  const arrowGeom = new THREE.ShapeGeometry(arrowShape);

  // 2. Høyre pil (Next)
  const nextBtn = new THREE.Mesh(arrowGeom, buttonMat);
  nextBtn.position.x = 0.25; // Plassert til høyre for play/pause
  nextBtn.userData = {
    clickable: true,
    action: "nextVideo",
    hotspot: "tv-next",
  };
  addHalo(hologramBtn, 0.25, 0); // behind next
  hologramBtn.add(nextBtn);

  // 3. Venstre pil (Prev)
  const prevBtn = new THREE.Mesh(arrowGeom, buttonMat);
  prevBtn.position.x = -0.25; // Plassert til venstre
  prevBtn.rotation.z = Math.PI; // Snu trekanten 180 grader
  prevBtn.userData = {
    clickable: true,
    action: "prevVideo",
    hotspot: "tv-prev",
  };
  addHalo(hologramBtn, -0.25, 0); // behind prev
  hologramBtn.add(prevBtn);

  group.add(hologramBtn);

  // Hologram Panel (Info-skjerm til venstre for TV)
  const infoPanel = new THREE.Group();
  infoPanel.name = "infoPanel";

  const panelBacking = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.0),
    new THREE.MeshStandardMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.05, // Sett til 0.0 hvis du vil ha den helt bort
      side: THREE.DoubleSide,
    }),
  );

  //infoPanel.add(panelBacking);

  // Plasser panelet rett foran TV-skjermen (z: 0.5 gjør at den svever foran)
  // Matcher screenMesh sin y=0.1, og svever 0.5 framfor skjermen
  infoPanel.position.set(0, 0.1, 0.4);
  infoPanel.rotation.y = 0;
  infoPanel.visible = false;

  group.add(infoPanel);

  // Info-ikon (En stilren bokstav "i")
  const infoIcon = new THREE.Group();
  infoIcon.name = "infoIcon";

  // Selve streken i i-en
  const iBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.08, 0.01), // Tynnere og kortere
    buttonMat,
  );
  const iDot = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 0.02, 0.01), // Mindre prikk
    buttonMat,
  );
  iDot.position.y = 0.07; // Flytt prikken litt ned siden streken er kortere

  addHalo(infoIcon, 0, 0.03); // behind info "i" (centred on body+dot midpoint)
  infoIcon.add(iBody, iDot);

  // Plasser den på linje med de andre knappene (x: 0.6)
  infoIcon.position.set(0.85, -0.55, 0.2);
  infoIcon.visible = false;

  // Legg til klikk-logikk på begge delene
  [iBody, iDot].forEach((part) => {
    part.userData = { clickable: true, action: "showInfo", hotspot: "tv-info" };
  });

  group.add(infoIcon);

  return group;
}
