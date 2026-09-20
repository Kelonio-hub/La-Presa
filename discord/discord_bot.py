import os
import requests
import random
import sys

# Configuración de URLs de los catálogos
BASE_URL = "https://raw.githubusercontent.com/Kelonio-hub/Link-3DS/main/productos/"
ARCHIVOS = ['switch.json', 'playstation.json', 'xbox.json', '3ds.json', 'nds.json', 'wii_wii_u.json', 'sd_usb.json']
ENLACE_WEB = "https://kelonio-hub.github.io/Archivos-Kelonio/productos.html"

# Obtener variables de entorno desde GitHub Actions
WEBHOOK_URL = os.environ.get("WEBHOOK_URL")
# Si no recibe el nombre del servidor, usará "nuestra comunidad" por defecto
NOMBRE_SERVIDOR = os.environ.get("NOMBRE_SERVIDOR", "nuestra comunidad")

if not WEBHOOK_URL:
    print("Error: WEBHOOK_URL no encontrada en las variables de entorno.")
    sys.exit(1)

def obtener_productos():
    todos_los_productos = []
    for archivo in ARCHIVOS:
        try:
            # Añadir un número aleatorio para evitar caché
            url = f"{BASE_URL}{archivo}?v={random.randint(1, 100000)}"
            respuesta = requests.get(url)
            if respuesta.status_code == 200:
                datos = respuesta.json()
                todos_los_productos.extend(datos)
        except Exception as e:
            print(f"Error al descargar {archivo}: {e}")
    return todos_los_productos

def enviar_a_discord(productos):
    embeds = []
    for p in productos:
        label = p.get('label', {}).get('es', 'Producto sin nombre')
        desc = p.get('desc', {}).get('es', 'Sin descripción')
        url = p.get('url', '') 
        img = p.get('img', '')
        precio = p.get('price', '')

        if not precio and '\n' in desc:
            partes = desc.split('\n')
            desc = partes[0]
            precio = partes[1] if len(partes) > 1 else ''

        descripcion_final = f"{desc}\n\n**Precio:** {precio}" if precio else desc

        embeds.append({
            "title": label,
            "description": descripcion_final,
            "url": url,
            "image": {"url": img},
            "color": 15007764
        })

    # Mensaje principal con el nombre dinámico del servidor
    payload = {
        "content": f"🔥 **¡Nuevos productos destacados del día en {NOMBRE_SERVIDOR}!** 🔥\n🌐 Visita nuestro catálogo completo aquí: {ENLACE_WEB}",
        "embeds": embeds
    }

    respuesta = requests.post(WEBHOOK_URL, json=payload)
    if respuesta.status_code in [200, 204]:
        print(f"Mensajes enviados a Discord ({NOMBRE_SERVIDOR}) correctamente.")
    else:
        print(f"Error al enviar a Discord ({NOMBRE_SERVIDOR}): {respuesta.status_code} - {respuesta.text}")
        sys.exit(1)

if __name__ == "__main__":
    productos = obtener_productos()
    if not productos:
        print("No se encontraron productos para enviar.")
        sys.exit(1)
    
    productos_validos = [p for p in productos if p.get('label') and p.get('label').get('es') != "Amazon Prime"]
    seleccion = random.sample(productos_validos, min(5, len(productos_validos)))
    
    enviar_a_discord(seleccion)
