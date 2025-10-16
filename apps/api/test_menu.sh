#!/bin/zsh
curl -X POST http://localhost:8000/llm/extract-menu \
  -H "Content-Type: application/json" \
  -d '{"source_type":"url","url":"https://www.cafeconstant.nl/"}'
