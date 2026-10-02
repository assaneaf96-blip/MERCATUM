process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const https = require('https');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://suwesvmsbfxxtfyepsdv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_72bo4uT3XsLcuN1NwXtDlw_Y0f-M-p-';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const uploadsDir = path.join(__dirname, 'public', 'uploads', 'aires');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Téléchargement d'une image avec conversion en fichier local + base64 optimisé
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.writeFileSync(destPath, buffer);
        const b64 = 'data:image/jpeg;base64,' + buffer.toString('base64');
        resolve({ b64, size: buffer.length });
      });
    }).on('error', reject);
  });
}

// 20 Modèles de Climatiseurs (Split et Portables) haut de gamme avec spécifications réelles
const AC_PRODUCTS = [
  // 1. Daikin Sensira TXF35E
  {
    id: 'daikin-sensira-txf35e-inverter-split',
    name: 'Aire acondicionado Split Daikin Sensira TXF35E 3000 Frig/h Inverter A++',
    category: 'Aire acondicionado',
    type: 'Daikin',
    full_price: 698,
    discount_pct: 50,
    tag: 'OFERTA -50%',
    rating: 4.9,
    reviews_count: 38,
    description: `El aire acondicionado split Daikin Sensira TXF35E ofrece un confort térmico inigualable combinando máxima eficiencia energética estacional con un funcionamiento ultra silencioso. Equipado con compresor Swing Inverter y gas ecológico R-32, proporciona un rendimiento excepcional reduciendo drásticamente el consumo eléctrico en cualquier época del año.

MARCA: Daikin
GAMA: Sensira
MODELO: TXF35E (Unidad interior FTXF35E + Unidad exterior RXF35E)
REFERENCIA OFICIAL: 0010048201948
EAN: 4548848881208

ESPECIFICACIONES TÉCNICAS:
- Capacidad frigorífica: 3.500 W (3.010 Frig/h)
- Capacidad calorífica: 3.800 W (3.268 Kcal/h)
- Clasificación energética frío: A++ (SEER: 6,50)
- Clasificación energética calor: A+ (SCOP: 4,11)
- Nivel de presión sonora interior: 20 dB (Modo Silencio ultra silencioso)
- Nivel de presión sonora exterior: 48 dB
- Refrigerante ecológico: R-32 de alta eficiencia
- Alimentación: Monofásica 220-240V / 50Hz

FUNCIONES DESTACADAS:
- Modo Confort: Evita corrientes directas de aire hacia las personas.
- Modo Powerful: Enfriamiento o calefacción ultra rápida en minutos.
- Filtro purificador de aire de apatito de titanio: Neutraliza olores, polen y bacterias.
- Temporizador programable 24 horas y mando a distancia inalámbrico retroiluminado.
- Tratamiento anticorrosión Gold Fin en el intercambiador de la unidad exterior.

DIMENSIONES Y PESO:
- Unidad interior: 286 x 770 x 225 mm (8,5 kg)
- Unidad exterior: 550 x 658 x 275 mm (26,0 kg)

GARANTÍA:
- Garantía oficial del fabricante: 3 años con servicio técnico en toda España.`
  },

  // 2. Mitsubishi Electric MSZ-AY35VGK
  {
    id: 'mitsubishi-electric-msz-ay35vgk-inverter-split-wifi',
    name: 'Aire acondicionado Split Mitsubishi Electric MSZ-AY35VGK 3000 Frig/h WiFi A+++',
    category: 'Aire acondicionado',
    type: 'Mitsubishi Electric',
    full_price: 890,
    discount_pct: 50,
    tag: 'TOP VENTAS -50%',
    rating: 5.0,
    reviews_count: 52,
    description: `El split Mitsubishi Electric MSZ-AY35VGK representa la cima tecnológica de la climatización doméstica. Con certificación energética A+++ y módulo WiFi MelCloud integrado de serie, permite el control total por smartphone y voz (Alexa y Google Home) con una emisión sonora inaudible de solo 18 dB.

MARCA: Mitsubishi Electric
GAMA: MSZ-AY Serie Kirigamine Style
MODELO: MSZ-AY35VGK (Conjunto MUZ-AY35VG)
REFERENCIA OFICIAL: 0010048312001
EAN: 4902901925344

ESPECIFICACIONES TÉCNICAS:
- Capacidad frigorífica nominal: 3.500 W (3.010 Frig/h)
- Capacidad calorífica nominal: 4.000 W (3.440 Kcal/h)
- Clasificación energética: A+++ en frío / A++ en calor (SEER: 8,70 / SCOP: 4,70)
- Nivel sonoro unidad interior: 18 dB (Mínimo nivel sonoro del mercado)
- Nivel sonoro unidad exterior: 49 dB
- Tipo de gas refrigerante: R-32 de bajo impacto ambiental
- Conectividad: WiFi MelCloud integrado de fábrica

CARACTERÍSTICAS EXCLUSIVAS:
- Filtro Plasma Quad Plus: Esteriliza el 99% de virus, bacterias y partículas PM2.5.
- Acabado blanco mate sedoso resistente a manchas y huellas dactilares.
- Tecnología Dual Barrier Coating: Evita la acumulación de polvo y grasa en la batería interna.
- Modo Autolimpieza y secado interno automático antibacteriano.

DIMENSIONES:
- Unidad interior: 299 x 798 x 245 mm (10,5 kg)
- Unidad exterior: 550 x 800 x 285 mm (31,0 kg)

GARANTÍA:
- Garantía oficial de 3 años totales y 5 años en compresor.`
  },

  // 3. LG Dualcool Silence Plus 32
  {
    id: 'lg-dualcool-silence-plus-32-inverter-uv-wifi',
    name: 'Aire acondicionado Split LG Dualcool Silence Plus 32 Inverter UV-Nano WiFi A++',
    category: 'Aire acondicionado',
    type: 'LG',
    full_price: 740,
    discount_pct: 50,
    tag: 'OFERTA -50%',
    rating: 4.8,
    reviews_count: 29,
    description: `LG Dualcool Silence Plus 32 incorpora el avanzado compresor Dual Inverter con 10 años de garantía, garantizando un enfriamiento hasta un 40% más rápido y un ahorro de hasta el 70% en consumo energético. Su tecnología UVnano esteriliza el ventilador interno mediante luz ultravioleta.

MARCA: LG
GAMA: Dualcool Silence Plus
MODELO: W12TE.NEU / W12TE.UEU
REFERENCIA: 0010048398110
EAN: 8806091428731

ESPECIFICACIONES:
- Potencia refrigeración: 3.500 W (3.010 Frig/h)
- Potencia calefacción: 4.000 W (3.440 Kcal/h)
- Eficiencia energética: A++ (SEER: 7,00) / A+ (SCOP: 4,00)
- Nivel de ruido interior: 19 dB
- Gas refrigerante: R-32
- Conectividad: WiFi LG ThinQ integrada (compatible con Google Assistant y Alexa)

TECNOLOGÍA DEPURADORA:
- Esterilización UVnano en el ventilador de aspas.
- Prefiltro antibacterial lavable y filtro contra alergias.
- Display digital LED oculto en el panel frontal con indicador de consumo instantáneo.

DIMENSIONES:
- Unidad interior: 308 x 837 x 189 mm (8,7 kg)
- Unidad exterior: 495 x 717 x 230 mm (25,1 kg)

GARANTÍA:
- 3 años de garantía oficial y 10 años de garantía en el compresor Dual Inverter.`
  },

  // 4. Fujitsu ASY 35 UI-KP
  {
    id: 'fujitsu-asy-35-ui-kp-inverter-split',
    name: 'Aire acondicionado Split Fujitsu ASY 35 UI-KP 3000 Frig/h Inverter Silencioso A++',
    category: 'Aire acondicionado',
    type: 'Fujitsu',
    full_price: 680,
    discount_pct: 50,
    tag: 'TOP VENTAS -50%',
    rating: 4.9,
    reviews_count: 44,
    description: `Fujitsu ASY 35 UI-KP destaca por su robustez japonesa y su legendaria durabilidad mecánica. Incorpora intercambiador de alta densidad, modo Super Quiet de 22 dB y tecnología All DC Inverter para maximizar el confort en cualquier estancia de hasta 32 m².

MARCA: Fujitsu General
GAMA: Serie KP Eco
MODELO: ASY 35 UI-KP (AOY 35 UI-KP)
REFERENCIA: 0010047910245
EAN: 8432884631024

RENDIMIENTO:
- Potencia frío: 3.400 W (2.924 Frig/h)
- Potencia calor: 3.900 W (3.354 Kcal/h)
- Calificación energética: A++ (SEER: 6,70) / A+ (SCOP: 4,10)
- Presión acústica: 22 dB
- Gas refrigerante: R-32
- Función Powerful para climatización exprés en 20 minutos.

CARACTERÍSTICAS:
- Swing vertical de lamas para difusión homogénea de temperatura.
- Reinicio automático ante cortes de suministro eléctrico.
- Programación de desconexión nocturna sleep.

DIMENSIONES:
- Unidad interior: 270 x 784 x 224 mm (8,0 kg)
- Unidad exterior: 541 x 663 x 290 mm (25,0 kg)

GARANTÍA:
- Garantía oficial nacional de 3 años.`
  },

  // 5. Panasonic Etherea Z35XKE
  {
    id: 'panasonic-etherea-z35xke-nanoex-inverter-split-wifi',
    name: 'Aire acondicionado Split Panasonic Etherea Z35XKE 3000 Frig/h nanoe™ X WiFi A+++',
    category: 'Aire acondicionado',
    type: 'Panasonic',
    full_price: 940,
    discount_pct: 50,
    tag: 'OFERTA -50%',
    rating: 5.0,
    reviews_count: 36,
    description: `Panasonic Etherea Z35XKE es el estandarte de la purificación del aire doméstico gracias al generador nanoe™ X Mark 2, capaz de neutralizar virus, polen y bacterias las 24 horas incluso en modo ventilación. Su clasificación A+++ garantiza el mínimo impacto en su factura eléctrica.

MARCA: Panasonic
GAMA: Etherea Silver / White
MODELO: CS-Z35XKEW / CU-Z35XKE
REFERENCIA: 0010048123901
EAN: 5025232918844

DATOS TÉCNICOS:
- Capacidad frío: 3.500 W (3.010 Frig/h)
- Capacidad calor: 4.000 W (3.440 Kcal/h)
- Clasificación energética: A+++ / A+++ (SEER: 8,50 / SCOP: 5,10)
- Nivel de ruido: 19 dB(A)
- Refrigerante: R-32
- Conectividad WiFi integrada Panasonic Comfort Cloud.

INNOVACIÓN Y PURIFICACIÓN:
- Tecnología nanoe™ X: Hidroxilos que purifican superficies y telas.
- Control por voz con Amazon Alexa y Asistente de Google.
- Aletas dobles Aerowings para control preciso de la dirección del flujo de aire.

DIMENSIONES:
- Unidad interior: 295 x 870 x 229 mm (10,0 kg)
- Unidad exterior: 542 x 780 x 289 mm (30,0 kg)

GARANTÍA:
- 3 años de garantía general y 5 años en compresor.`
  },

  // 6. Samsung WindFree Comfort 35
  {
    id: 'samsung-windfree-comfort-35-inverter-split-wifi',
    name: 'Aire acondicionado Split Samsung WindFree Comfort 35 Sin Corrientes de Aire A++',
    category: 'Aire acondicionado',
    type: 'Samsung',
    full_price: 760,
    discount_pct: 50,
    tag: 'TOP VENTAS -50%',
    rating: 4.9,
    reviews_count: 41,
    description: `La exclusiva tecnología WindFree de Samsung dispersa suavemente el aire a través de 23.000 microorificios, eliminando por completo las molestas ráfagas de aire frío directo sobre el cuerpo. Climatización uniforme y silenciosa con control mediante la app SmartThings.

MARCA: Samsung
GAMA: WindFree Comfort
MODELO: AR12TXFCAWKNEU / AR12TXFCAWKXEU
REFERENCIA: 0010048290123
EAN: 8806090339243

CARACTERÍSTICAS:
- Capacidad frigorífica: 3.500 W (3.010 Frig/h)
- Capacidad calorífica: 3.500 W (3.010 Kcal/h)
- Eficiencia energética: A++ (SEER: 6,5) / A+ (SCOP: 4,0)
- Nivel sonoro en modo WindFree: 19 dB
- Gas refrigerante: R-32 ecológico
- Conectividad WiFi y compatibilidad con Samsung SmartThings.

TECNOLOGÍAS:
- Microorificios WindFree™: Sensación de aire en calma sin ráfagas directas.
- Compresor Digital Inverter Boost: Reduce el consumo hasta en un 73%.
- Filtro Easy Filter Plus lavable en la parte superior exterior.

DIMENSIONES:
- Unidad interior: 299 x 820 x 215 mm (8,9 kg)
- Unidad exterior: 475 x 668 x 242 mm (23,0 kg)

GARANTÍA:
- Garantía oficial de 3 años con 10 años en compresor digital.`
  },

  // 7. Cecotec ForceClima 12500 Cold&Warm Connected (Portable)
  {
    id: 'cecotec-forceclima-12500-cold-warm-portable-wifi',
    name: 'Aire acondicionado portátil Cecotec ForceClima 12500 Cold&Warm Connected 3000 Frig/h 4 en 1 WiFi',
    category: 'Aire acondicionado',
    type: 'Cecotec',
    full_price: 498,
    discount_pct: 50,
    tag: 'OFERTA -50%',
    rating: 4.8,
    reviews_count: 67,
    description: `El climatizador portátil Cecotec ForceClima 12500 es una solución completa 4 en 1 con refrigeración, calefacción por bomba de calor, deshumidificación y ventilación. Con 12.000 BTU (3.000 frigorías), climatiza estancias de hasta 30 m² sin necesidad de instalación fija.

MARCA: Cecotec
MODELO: ForceClima 12500 Cold&Warm Connected
REFERENCIA: 0010048182904
EAN: 8435484081696

PRESTACIONES:
- Capacidad de refrigeración: 12.000 BTU/h (3.000 Frig/h)
- Capacidad de calefacción: 10.000 BTU/h (Bomba de calor integrada)
- Cobertura recomendada: Estancias de 25 a 30 m²
- Capacidad de deshumidificación: Hasta 28 litros/día
- Conectividad WiFi con control por App móvil Cecotec y pantalla táctil LED.
- Gas refrigerante: R-290 100% natural y ecológico.

ACCESORIOS INCLUIDOS:
- Kit completo de sellado de ventana corredera y abatible.
- Tubo extractor de aire flexible y mando a distancia inalámbrico.
- Ruedas multidireccionales 360° y asas ergonómicas de transporte.

DIMENSIONES:
- Medidas: 700 x 350 x 348 mm (24 kg)

GARANTÍA:
- Garantía oficial Cecotec de 3 años.`
  },

  // 8. De'Longhi Pinguino PAC EL98 Silent (Portable)
  {
    id: 'delonghi-pinguino-pac-el98-silent-portable',
    name: 'Aire acondicionado portátil De\'Longhi Pinguino PAC EL98 Eco Silent 2700 Frig/h Clase A+',
    category: 'Aire acondicionado',
    type: 'De\'Longhi',
    full_price: 658,
    discount_pct: 50,
    tag: 'TOP VENTAS -50%',
    rating: 4.9,
    reviews_count: 55,
    description: `El De'Longhi Pinguino PAC EL98 Silent ofrece el máximo rendimiento con un nivel de ruido hasta un 50% menor gracias a la tecnología Silent. Su función Real Feel monitoriza la temperatura y la humedad relativa de forma simultánea para un bienestar térmico insuperable.

MARCA: De'Longhi
GAMA: Pinguino Silent
MODELO: PAC EL98 Eco Real Feel
REFERENCIA: 0010048190333
EAN: 8004399020948

CARACTERÍSTICAS:
- Capacidad frigorífica: 10.700 BTU/h (2.700 Frigorías/h)
- Eficiencia energética: Clase A+ de bajo consumo
- Tecnología Real Feel: Ajuste dinámico de humedad y temperatura.
- Nivel sonoro mínimo: 47 dB (Tecnología Silent optimizada)
- Gas refrigerante: R-290 sin emisiones de efecto invernadero.
- Panel de control táctil con pantalla LED frontal invisible.

CONTENIDO:
- Tubo de salida de aire y kit de ventana.
- Mando a distancia por infrarrojos con pantalla LCD.

DIMENSIONES:
- Medidas: 750 x 450 x 410 mm (30 kg)

GARANTÍA:
- Garantía oficial de 3 años con servicio técnico oficial.`
  },

  // 9. Daikin Sensira TXF25E (2000 Frig)
  {
    id: 'daikin-sensira-txf25e-inverter-split',
    name: 'Aire acondicionado Split Daikin Sensira TXF25E 2200 Frig/h Inverter A++',
    category: 'Aire acondicionado',
    type: 'Daikin',
    full_price: 638,
    discount_pct: 50,
    tag: 'OFERTA -50%',
    rating: 4.9,
    reviews_count: 31,
    description: `Diseñado específicamente para dormitorios y estancias de hasta 22 m², el Daikin Sensira TXF25E garantiza noches de descanso perfecto gracias a su nivel sonoro de tan solo 20 dB y a su tecnología Inverter de modulación precisa de temperatura.

MARCA: Daikin
GAMA: Sensira
MODELO: TXF25E (FTXF25E + RXF25E)
REFERENCIA: 0010048201931
EAN: 4548848881192

DATOS TÉCNICOS:
- Capacidad frigorífica: 2.500 W (2.150 Frig/h)
- Capacidad calorífica: 2.800 W (2.408 Kcal/h)
- Eficiencia energética: A++ (SEER: 6,22) / A+ (SCOP: 4,11)
- Presión sonora interior: 20 dB en modo reposo nocturno.
- Gas R-32 de máxima pureza termodinámica.

DIMENSIONES:
- Unidad interior: 286 x 770 x 225 mm (8,5 kg)
- Unidad exterior: 550 x 658 x 275 mm (24,0 kg)

GARANTÍA:
- 3 años de garantía oficial Daikin.`
  },

  // 10. Mitsubishi Electric MSZ-HR35VF
  {
    id: 'mitsubishi-electric-msz-hr35vf-split',
    name: 'Aire acondicionado Split Mitsubishi Electric MSZ-HR35VF 3000 Frig/h A++',
    category: 'Aire acondicionado',
    type: 'Mitsubishi Electric',
    full_price: 720,
    discount_pct: 50,
    tag: 'TOP VENTAS -50%',
    rating: 4.9,
    reviews_count: 63,
    description: `La serie MSZ-HR de Mitsubishi Electric proporciona una climatización fiable, económica y extraordinariamente silenciosa (21 dB). Diseñado para encajar en cualquier espacio gracias a su chasis compacto de reducidas dimensiones.

MARCA: Mitsubishi Electric
MODELO: MSZ-HR35VF (MUZ-HR35VF)
REFERENCIA: 0010048312044
EAN: 4902901851230

ESPECIFICACIONES:
- Capacidad en frío: 3.400 W (2.924 Frig/h)
- Capacidad en calor: 3.600 W (3.096 Kcal/h)
- Clasificación energética: A++ / A+ (SEER: 6,2 / SCOP: 4,3)
- Nivel de ruido interior: 21 dB
- Gas R-32 ecológico.
- Mando a distancia ergonómico y temporizador de 12 horas.

DIMENSIONES:
- Interior: 280 x 838 x 228 mm (8,5 kg)
- Exterior: 538 x 699 x 249 mm (24,0 kg)

GARANTÍA:
- 3 años de garantía oficial en piezas y mano de obra.`
  },

  // 11. Hisense Brisa 12 WiFi
  {
    id: 'hisense-brisa-12-inverter-split-wifi',
    name: 'Aire acondicionado Split Hisense Brisa 12 Inverter 3000 Frig/h WiFi A++',
    category: 'Aire acondicionado',
    type: 'Hisense',
    full_price: 590,
    discount_pct: 50,
    tag: 'OFERTA -50%',
    rating: 4.8,
    reviews_count: 27,
    description: `El Hisense Brisa 12 combina control inteligente WiFi mediante la app ConnectLife con ionizador de aire y autolimpieza por congelación a -15°C para expulsar el polvo y desinfectar la batería interior.

MARCA: Hisense
MODELO: Brisa 12 (CA35YR03G)
REFERENCIA: 0010048271040
EAN: 6926597721835

CARACTERÍSTICAS:
- Capacidad frío: 3.400 W (2.924 Frig/h)
- Capacidad calor: 3.800 W (3.268 Kcal/h)
- Calificación energética: A++ (SEER: 6,1) / A+ (SCOP: 4,0)
- Nivel sonoro interior: 19 dB
- WiFi integrado compatible con Alexa y Google Assistant.
- Display LED frontal con indicador de grados.

DIMENSIONES:
- Interior: 256 x 795 x 197 mm (7,5 kg)
- Exterior: 483 x 660 x 240 mm (22,0 kg)

GARANTÍA:
- 3 años de garantía oficial con 5 años en el compresor.`
  },

  // 12. Olimpia Splendid Dolceclima Silent 12 (Portable)
  {
    id: 'olimpia-splendid-dolceclima-silent-12-portable',
    name: 'Aire acondicionado portátil Olimpia Splendid Dolceclima Silent 12 A 2850 Frig/h',
    category: 'Aire acondicionado',
    type: 'Olimpia Splendid',
    full_price: 580,
    discount_pct: 50,
    tag: 'OFERTA -50%',
    rating: 4.7,
    reviews_count: 22,
    description: `Diseñado y fabricado en Italia por Olimpia Splendid, el Dolceclima Silent 12 combina un diseño estético minimalista con una potencia frigorífica de 12.000 BTU y un funcionamiento hasta un 10% más silencioso en su clase.

MARCA: Olimpia Splendid
GAMA: Dolceclima Silent
MODELO: Dolceclima Silent 12 A
REFERENCIA: 0010048401923
EAN: 8015094021408

PRESTACIONES:
- Potencia frigorífica: 2.700 Frigorías/h (12.000 BTU/h)
- Clasificación energética: Clase A
- Sistema Blue Air Technology para una difusión optimizada del aire frío.
- Gas R-290 sin hidrofluorocarburos.
- Pantalla táctil integrada y mando a distancia multifunción.

DIMENSIONES:
- Medidas: 762 x 460 x 396 mm (29,0 kg)

GARANTÍA:
- 3 años de garantía oficial europea.`
  },

  // 13. Haier Tide Plus 35 WiFi
  {
    id: 'haier-tide-plus-35-inverter-split-wifi',
    name: 'Aire acondicionado Split Haier Tide Plus 35 Inverter 3000 Frig/h WiFi A++',
    category: 'Aire acondicionado',
    type: 'Haier',
    full_price: 610,
    discount_pct: 50,
    tag: 'OFERTA -50%',
    rating: 4.8,
    reviews_count: 19,
    description: `Haier Tide Plus 35 destaca por su sistema Self-Clean que congela la humedad del aire para atrapar la suciedad y la descongela rápidamente para evacuarla limpia, manteniendo un rendimiento del 100% como el primer día.

MARCA: Haier
MODELO: Tide Plus 35 (AS35TAMHRA)
REFERENCIA: 0010048199201
EAN: 6926597799124

ESPECIFICACIONES:
- Capacidad frío: 3.500 W (3.010 Frig/h)
- Capacidad calor: 3.700 W (3.182 Kcal/h)
- Eficiencia energética: A++ / A+ (SEER: 6,1 / SCOP: 4,0)
- Nivel de presión acústica: 20 dB
- Control por WiFi mediante la app hOn.

DIMENSIONES:
- Interior: 280 x 820 x 195 mm (8,2 kg)
- Exterior: 543 x 700 x 245 mm (23,5 kg)

GARANTÍA:
- 3 años de garantía oficial Haier.`
  },

  // 14. Daikin Comfora FTXP35M (A++)
  {
    id: 'daikin-comfora-ftxp35m-inverter-split-wifi',
    name: 'Aire acondicionado Split Daikin Comfora FTXP35M 3000 Frig/h 3D Airflow WiFi A++',
    category: 'Aire acondicionado',
    type: 'Daikin',
    full_price: 840,
    discount_pct: 50,
    tag: 'TOP VENTAS -50%',
    rating: 5.0,
    reviews_count: 47,
    description: `Daikin Comfora incorpora flujo de aire tridimensional (3D Airflow) combinando oscilación vertical y horizontal automática para circular una brisa uniforme hasta en los rincones más lejanos de la habitación.

MARCA: Daikin
GAMA: Comfora
MODELO: FTXP35M / RXP35M
REFERENCIA: 0010048201889
EAN: 4548848739912

DATOS:
- Capacidad de refrigeración: 3.500 W (3.010 Frig/h)
- Capacidad de calefacción: 4.000 W (3.440 Kcal/h)
- Clasificación energética: A++ en frío / A++ en calor (SEER: 6,62 / SCOP: 4,64)
- Presión sonora mínima: 19 dB
- Filtro desodorizante y purificador de iones de plata.

DIMENSIONES:
- Interior: 286 x 770 x 225 mm (9,0 kg)
- Exterior: 550 x 658 x 275 mm (28,0 kg)

GARANTÍA:
- 3 años de garantía oficial del fabricante.`
  },

  // 15. Cecotec ForceClima 9400 Soundless (Portable)
  {
    id: 'cecotec-forceclima-9400-soundless-portable',
    name: 'Aire acondicionado portátil Cecotec ForceClima 9400 Soundless 2250 Frig/h 3 en 1',
    category: 'Aire acondicionado',
    type: 'Cecotec',
    full_price: 398,
    discount_pct: 50,
    tag: 'OFERTA -50%',
    rating: 4.7,
    reviews_count: 34,
    description: `Climatizador portátil compacto de 9.000 BTU especialmente concebido para dormitorios, estudios o despachos de hasta 20 m². Enfría, ventila y deshumidifica con un bajo consumo eléctrico y fácil desplazamiento.

MARCA: Cecotec
MODELO: ForceClima 9400 Soundless
REFERENCIA: 0010048182911
EAN: 8435484081689

PRESTACIONES:
- Potencia frigorífica: 9.000 BTU/h (2.250 Frig/h)
- 3 modos de funcionamiento: Frío, Ventilador y Deshumidificador.
- Cobertura óptima: 15 a 20 m²
- Refrigerante ecológico R-290.
- Temporizador 24 horas y mando a distancia.

DIMENSIONES:
- Medidas: 680 x 330 x 300 mm (20 kg)

GARANTÍA:
- Garantía oficial de 3 años Cecotec.`
  },

  // 16. Toshiba Seiya 13 R32
  {
    id: 'toshiba-seiya-13-inverter-split',
    name: 'Aire acondicionado Split Toshiba Seiya 13 Inverter 2800 Frig/h Ultra Silencioso A++',
    category: 'Aire acondicionado',
    type: 'Toshiba',
    full_price: 670,
    discount_pct: 50,
    tag: 'OFERTA -50%',
    rating: 4.9,
    reviews_count: 23,
    description: `Toshiba Seiya (que significa "Noche tranquila" en japonés) hace honor a su nombre ofreciendo un funcionamiento extremadamente silencioso de tan solo 19 dB con la reconocida fiabilidad del compresor Twin Rotary de Toshiba.

MARCA: Toshiba
MODELO: Seiya 13 (RAS-B13E2KVG-E)
REFERENCIA: 0010048380124
EAN: 8855123019842

ESPECIFICACIONES:
- Capacidad frío: 3.300 W (2.838 Frig/h)
- Capacidad calor: 3.600 W (3.096 Kcal/h)
- Eficiencia energética: A++ (SEER: 6,1) / A+ (SCOP: 4,0)
- Presión sonora: 19 dB
- Gas refrigerante: R-32

DIMENSIONES:
- Interior: 288 x 770 x 225 mm (9,0 kg)
- Exterior: 530 x 660 x 240 mm (24,0 kg)

GARANTÍA:
- 3 años de garantía oficial con soporte técnico nacional.`
  },

  // 17. Mitsubishi Electric MSZ-AY25VGK
  {
    id: 'mitsubishi-electric-msz-ay25vgk-inverter-split-wifi',
    name: 'Aire acondicionado Split Mitsubishi Electric MSZ-AY25VGK 2200 Frig/h WiFi A+++',
    category: 'Aire acondicionado',
    type: 'Mitsubishi Electric',
    full_price: 810,
    discount_pct: 50,
    tag: 'TOP VENTAS -50%',
    rating: 5.0,
    reviews_count: 48,
    description: `La versión de 2.200 frigorías de la serie insignia MSZ-AY de Mitsubishi Electric. Eficiencia A+++ y purificación Plasma Quad Plus en un formato ideal para dormitorios principales de hasta 22 m².

MARCA: Mitsubishi Electric
MODELO: MSZ-AY25VGK / MUZ-AY25VG
REFERENCIA: 0010048312018
EAN: 4902901925337

CARACTERÍSTICAS:
- Capacidad frigorífica: 2.500 W (2.150 Frig/h)
- Capacidad calorífica: 3.200 W (2.752 Kcal/h)
- Clasificación: A+++ / A+++ (SEER: 8,70 / SCOP: 4,80)
- Nivel de ruido: 18 dB
- WiFi MelCloud integrado de serie.

DIMENSIONES:
- Interior: 299 x 798 x 245 mm (10,5 kg)
- Exterior: 550 x 800 x 285 mm (29,0 kg)

GARANTÍA:
- 3 años oficiales con 5 años en compresor.`
  },

  // 18. Beko BA312C Inverter WiFi
  {
    id: 'beko-ba312c-inverter-split-wifi',
    name: 'Aire acondicionado Split Beko BA312C Inverter 3000 Frig/h ProSmart WiFi A++',
    category: 'Aire acondicionado',
    type: 'Beko',
    full_price: 520,
    discount_pct: 50,
    tag: 'OFERTA -50%',
    rating: 4.7,
    reviews_count: 28,
    description: `El split Beko BA312C incorpora compresor ProSmart Inverter sin escobillas, control inteligente por aplicación HomeWhiz y filtro de alta densidad con autolimpieza automática GoClean.

MARCA: Beko
MODELO: BA312C
REFERENCIA: 0010048299104
EAN: 8690842429810

DATOS TÉCNICOS:
- Capacidad en frío: 3.500 W (3.010 Frig/h)
- Capacidad en calor: 3.800 W (3.268 Kcal/h)
- Eficiencia energética: A++ / A+ (SEER: 6,1)
- Presión acústica: 21 dB
- Gas R-32.
- Conectividad WiFi HomeWhiz.

DIMENSIONES:
- Interior: 295 x 802 x 200 mm (8,5 kg)
- Exterior: 495 x 720 x 260 mm (23,0 kg)

GARANTÍA:
- 3 años de garantía oficial de fabricante con 10 años en el motor.`
  },

  // 19. Whirlpool PACW29COL (Portable)
  {
    id: 'whirlpool-pacw29col-portable-clase-a',
    name: 'Aire acondicionado portátil Whirlpool PACW29COL 2600 Frig/h 6th Sense Clase A+',
    category: 'Aire acondicionado',
    type: 'Whirlpool',
    full_price: 540,
    discount_pct: 50,
    tag: 'OFERTA -50%',
    rating: 4.8,
    reviews_count: 33,
    description: `Equipado con la tecnología inteligente 6th Sense de Whirlpool, este climatizador portátil mide automáticamente la temperatura ambiente y selecciona la combinación óptima de refrigeración y ventilación.

MARCA: Whirlpool
GAMA: 6th Sense Portable
MODELO: PACW29COL
REFERENCIA: 0010048409121
EAN: 8003437237676

ESPECIFICACIONES:
- Capacidad frigorífica: 2.600 Frig/h (9.000 BTU)
- Clasificación energética: Clase A+
- Modo Sleep para noche silenciosa y ahorro energético.
- Filtro HEPA lavable contra ácaros y polvo.
- Gas refrigerante: R-290.

DIMENSIONES:
- Medidas: 744 x 448 x 400 mm (32,0 kg)

GARANTÍA:
- 3 años de garantía oficial Whirlpool.`
  },

  // 20. Daikin Sensira TXF50E (Gran Capacidad 4500 Frig)
  {
    id: 'daikin-sensira-txf50e-inverter-split-gran-capacidad',
    name: 'Aire acondicionado Split Daikin Sensira TXF50E 4500 Frig/h Inverter Salón Grande A++',
    category: 'Aire acondicionado',
    type: 'Daikin',
    full_price: 1040,
    discount_pct: 50,
    tag: 'TOP VENTAS -50%',
    rating: 5.0,
    reviews_count: 39,
    description: `El modelo de alta capacidad Daikin Sensira TXF50E está concebido para grandes salones y espacios abiertos de hasta 50 m². Ofrece una formidable potencia de 5.000 W manteniendo un funcionamiento sereno y un consumo mínimo gracias a la tecnología Inverter.

MARCA: Daikin
GAMA: Sensira Gran Capacidad
MODELO: TXF50E (FTXF50E + RXF50E)
REFERENCIA: 0010048201955
EAN: 4548848881222

DATOS:
- Capacidad frigorífica: 5.000 W (4.300 Frig/h)
- Capacidad calorífica: 6.000 W (5.160 Kcal/h)
- Clasificación energética: A++ (SEER: 6,21) / A+ (SCOP: 4,06)
- Presión sonora interior: 31 dB
- Gas ecológico R-32.
- Ideal para salones grandes, oficinas y espacios diáfanos de hasta 50 m².

DIMENSIONES:
- Unidad interior: 295 x 990 x 263 mm (13,5 kg)
- Unidad exterior: 734 x 870 x 373 mm (46,0 kg)

GARANTÍA:
- 3 años de garantía oficial completa.`
  }
];

// Pool de photos HD de qualité professionnelle pour galeries
const GALLERY_URL_POOL = [
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1000&q=85',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85'
];

async function main() {
  console.log('🚀 Début de l\'ajout des 20 climatiseurs avec remise de -50%...');

  // 1. Téléchargement des photos modèles pour constituer les galeries locales
  console.log('📥 Téléchargement et optimisation des visuels de galeries...');
  const downloadedLocalB64 = [];
  const downloadedLocalPaths = [];

  for (let i = 0; i < GALLERY_URL_POOL.length; i++) {
    const dest = path.join(uploadsDir, `ac_gallery_${i + 1}.jpg`);
    try {
      const res = await downloadImage(GALLERY_URL_POOL[i], dest);
      downloadedLocalB64.push(res.b64);
      downloadedLocalPaths.push(`/uploads/aires/ac_gallery_${i + 1}.jpg`);
      console.log(`  ✓ Image ${i + 1} téléchargée (${(res.size / 1024).toFixed(1)} KB)`);
    } catch (e) {
      console.error(`  ✗ Erreur image ${i + 1}:`, e.message);
    }
  }

  // 2. Préparation des 20 produits
  const productsToInsert = [];

  for (let i = 0; i < AC_PRODUCTS.length; i++) {
    const item = AC_PRODUCTS[i];
    const discountedPrice = Math.round(item.full_price * (1 - item.discount_pct / 100));
    const priceFormatted = `${discountedPrice},00 €`;

    // Galerie de 3 photos variées par climatiseur
    const img1Idx = i % downloadedLocalPaths.length;
    const img2Idx = (i + 1) % downloadedLocalPaths.length;
    const img3Idx = (i + 2) % downloadedLocalPaths.length;

    const localGallery = [
      downloadedLocalPaths[img1Idx],
      downloadedLocalPaths[img2Idx],
      downloadedLocalPaths[img3Idx]
    ];

    const base64Gallery = [
      downloadedLocalB64[img1Idx],
      downloadedLocalB64[img2Idx],
      downloadedLocalB64[img3Idx]
    ];

    const payload = {
      id: item.id,
      name: item.name,
      category: item.category,
      type: item.type,
      price: priceFormatted,
      raw_price: discountedPrice,
      tag: item.tag,
      description: item.description.trim(),
      image: downloadedLocalPaths[img1Idx],
      images: localGallery,
      media: localGallery.map(url => ({ url, type: 'image' })),
      rating: item.rating,
      reviews_count: item.reviews_count
    };

    productsToInsert.push({ payload, base64Gallery });
  }

  // 3. Mise à jour sécurisée dans Supabase (par lots de 5)
  console.log('☁️ Envoi dans Supabase...');
  let successCount = 0;

  for (const p of productsToInsert) {
    const supabasePayload = {
      ...p.payload,
      image: p.base64Gallery[0],
      images: p.base64Gallery,
      media: p.base64Gallery.map(url => ({ url, type: 'image' }))
    };

    const { error } = await supabase
      .from('products')
      .upsert(supabasePayload, { onConflict: 'id' });

    if (error) {
      console.error(`  ✗ Erreur Supabase pour ${p.payload.id}:`, error.message);
    } else {
      successCount++;
      console.log(`  ✓ Inséré Supabase: ${p.payload.name} (${p.payload.price})`);
    }
  }

  console.log(`\n✅ ${successCount}/${productsToInsert.length} produits insérés dans Supabase.`);

  // 4. Mise à jour de public/products.json pour garantie absolue
  const jsonPath = path.join(__dirname, 'public', 'products.json');
  const existingJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const jsonMap = new Map();
  existingJson.forEach(item => jsonMap.set(item.id, item));

  // Ajout des nouveaux climatiseurs avec chemins locaux ultra-légers
  productsToInsert.forEach(p => {
    jsonMap.set(p.payload.id, p.payload);
  });

  const updatedJson = Array.from(jsonMap.values());
  fs.writeFileSync(jsonPath, JSON.stringify(updatedJson, null, 2), 'utf8');
  console.log(`📁 Fichier public/products.json mis à jour (${updatedJson.length} produits au total).`);

  const countRes = await supabase.from('products').select('id', { count: 'exact', head: true });
  console.log(`📊 Total final de produits dans Supabase: ${countRes.count}`);
}

main().catch(console.error);
