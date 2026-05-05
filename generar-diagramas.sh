#!/bin/bash
cd ~/gestion-escolar-erp
FOLDER="docs/flows"
OUTPUT="diagramas"
mkdir -p $OUTPUT

for file in $FOLDER/*.md; do
  base=$(basename "$file" .md)
  echo "Procesando $base..."
  # Extraer bloque mermaid (entre ```mermaid y ```)
  sed -n '/```mermaid/,/```/ { /```mermaid/d; /```/d; p; }' "$file" > $OUTPUT/$base.mmd
  # Generar PNG (A4 = 210x297mm ~ 794x1123px a 96dpi)
  npx mmdc -i $OUTPUT/$base.mmd -o $OUTPUT/$base.png -w 794 -H 1123 --backgroundColor white
  rm $OUTPUT/$base.mmd
  echo "✔ $base.png generado."
done
echo "Listo. Las imágenes están en la carpeta $OUTPUT/"
