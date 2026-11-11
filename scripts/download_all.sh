#!/usr/bin/env zsh
set -e

mkdir -p "data/meta_filings"

files=(
  "18xeAaiMsdNK9HWuKwpdsIVuze5GWZ8kV:2025-Meta-Code-of-Conduct-02-11-26-English-External.pdf"
  "1IBw8yR8_RvAaWrjR_L6inVvQis12aw-a:Building Generative AI Features Responsibly.pdf"
  "1IpHbxrdIVbFJer5z0gZmGK9-ZgJFMYGN:Community Standards _ Transparency Center.pdf"
  "18LYv6EI7jbXpPSy7e0eZMs3fSrGDUTOj:Community Standards Enforcement Report.pdf"
  "1tdLj68bHDJK3ucV1-9eVGuMjSkNxPaUT:Creator Fast Track_ A New Way to Quickly Grow Your Audience and Earn Money on Facebook.pdf"
  "1w1OQHJ84ogYAzEPapHrWFdjqCtmgIgI1:Document.pdf"
  "1xoDLHmJC111kgZTCnl48QcBUjO8yBFsw:Facebooks-Corporate-Human-Rights-Policy.pdf"
  "15LVVThZamb5HMxOTXUd3Rn-5zMlNCYOq:Introduction to the Advertising Standards _ Transparency Center.pdf"
  "1_B6kzJEzzYJVWFPqEtmqneIKMaahp3Me:Measures We've Put in Place to Fight Child Exploitation.pdf"
  "1YmmrrFuKtHvCFHIQ_pGN8TkxgpBWveIU:meta-20251231.pdf"
  "1GLJJ8-6f5cnoTYKmV8_GOvlP-53lKFca:meta-20260416.pdf"
  "1zs3RgSJnLECHBYJPZuwglt0skd29erkq:Meta-A-R-Bylaws-9-05-2024.pdf"
  "1uKi_-8Xe86En4Zmyp7ZoIvlGiJlP3yAR:Meta-Audit-Privacy-Committee-Charter-Effective-June-1-2025.pdf"
  "1KNaBKmj0Did016muXVAjw9WEShBhIB2f:Meta-Compensation-Nominating-Governance-Committee-Charter-Effective-June-1-2025.pdf"
  "1vD5dy34B08WuM2YrtXJHs5weuZxAvSZT:Meta-Corporate-Governance-Guidelines-Effective-June-1-2025.pdf"
  "1SkDgpZBQh2nR2IaWhCErUfVcEmnI0mks:Meta-Risk-Strategy-Committee-Charter-Effective-June-1-2025.pdf"
  "15WZzy5pCGIuGFOM6s4SYPQtsJLiGaxD9:Meta_2025-Sustainability-Report.pdf"
  "11mt-9kG9KThWonWYgtrrLc3DmXwLT5uE:Meta_Human-Rights-Report-July-2022.pdf"
  "1447b-4rkCflix8uDXRsWXq3wkzgBtgRB:Regulatory and Other Transparency Reports.pdf"
)

total=${#files[@]}
idx=1

for entry in "${files[@]}"; do
  file_id="${entry%%:*}"
  filename="${entry#*:}"
  outpath="data/meta_filings/${filename}"

  if [[ -f "$outpath" && -s "$outpath" ]]; then
    echo "[$idx/$total] [EXISTS] $filename"
  else
    echo "[$idx/$total] [DOWNLOADING] $filename..."
    gdrive readonly download "$file_id" --out "$outpath"
  fi
  idx=$((idx + 1))
done

echo "Done! All files in data/meta_filings/"

