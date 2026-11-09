# Ver o elemento raiz definido em cada XSD
for file in dist/schemas/*.xsd; do
  echo "=== $(basename $file) ==="
  xmllint --xpath '/*[1]/@name' "$file" 2>/dev/null || echo "Não é schema válido ou não tem atributo name"
done

echo "---"

# Ou procure por "enviNFe" especificamente
grep -l "enviNFe" dist/schemas/*.xsd
