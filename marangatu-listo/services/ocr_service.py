import os
from google import genai
from google.genai import types
import base64
from typing import Dict, Optional
import json
from dotenv import load_dotenv

load_dotenv()

class OCRService:
    def __init__(self):
        """Inicializa o cliente Google Gemini"""
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY não encontrada nas variáveis de ambiente")
        
        self.client = genai.Client(api_key=api_key)
    
    def extract_factura_data(self, image_bytes: bytes) -> Dict[str, Optional[str]]:
        """
        Extrai dados estruturados de uma factura usando Google Gemini
        
        Args:
            image_bytes: Bytes da imagem da factura
            
        Returns:
            Dicionário com fecha, local, valor, ruc_emisor
        """
        try:
            # Converter imagem para base64
            image_b64 = base64.b64encode(image_bytes).decode('utf-8')
            
            # Prompt para extrair dados da factura paraguaia
            prompt = """Analiza esta imagen de una factura paraguaya y extrae los siguientes datos en formato JSON:

{
  "fecha": "fecha de la factura en formato DD/MM/YYYY",
  "local": "nombre del establecimiento o comercio",
  "valor": "valor total en guaraníes (solo el número, sin puntos ni comas)",
  "ruc_emisor": "RUC del emisor en formato 12345678-9"
}

REGLAS IMPORTANTES:
- Si no encuentras algún dato, usa null
- Para el valor, extrae solo números (ejemplo: si dice "Gs. 150.000", retorna "150000")
- El RUC debe tener el formato XXXXXXXX-X (8 dígitos, guión, 1 dígito)
- La fecha debe estar en formato DD/MM/YYYY
- Retorna SOLO el JSON, sin texto adicional

Analiza cuidadosamente la factura y extrae los datos solicitados."""

            # Chamar Gemini com visão
            response = self.client.models.generate_content(
                model='gemini-2.0-flash-exp',
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part.from_text(prompt),
                            types.Part.from_bytes(
                                data=image_bytes,
                                mime_type="image/jpeg"
                            )
                        ]
                    )
                ]
            )
            
            # Extrair resposta
            result_text = response.text.strip()
            
            # Tentar extrair JSON da resposta
            # Remove markdown code blocks se existirem
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()
            
            # Parse JSON
            data = json.loads(result_text)
            
            # Validar e limpar dados
            return {
                "fecha": data.get("fecha"),
                "local": data.get("local"),
                "valor": str(data.get("valor")) if data.get("valor") else None,
                "ruc_emisor": data.get("ruc_emisor")
            }
            
        except json.JSONDecodeError as e:
            print(f"Erro ao fazer parse do JSON: {e}")
            print(f"Resposta recebida: {result_text}")
            # Retornar dados vazios em caso de erro
            return {
                "fecha": None,
                "local": None,
                "valor": None,
                "ruc_emisor": None
            }
        except Exception as e:
            print(f"Erro ao processar imagem: {e}")
            raise
    
    def parse_factura(self, text: str = None) -> Dict[str, Optional[str]]:
        """
        Analisa o texto extraído e retorna informações da factura
        
        Args:
            text: Texto extraído da factura
            
        Returns:
            Dicionário com fecha, local, valor, ruc_emisor
        """
        result = {
            "fecha": None,
            "local": None,
            "valor": None,
            "ruc_emisor": None
        }
        
        # Buscar RUC (formato paraguaio: 12345678-9)
        ruc_match = re.search(r'\b\d{6,8}-\d\b', text)
        if ruc_match:
            result["ruc_emisor"] = ruc_match.group()
        
        # Buscar valor total (Gs. o guaraníes)
        # Padrões comuns: "Total: Gs. 150.000", "TOTAL Gs 150000", etc.
        valor_patterns = [
            r'total[:\s]+gs\.?\s*([\d.,]+)',
            r'gs\.?\s*([\d.,]+)',
            r'guaraníes[:\s]+([\d.,]+)'
        ]
        
        for pattern in valor_patterns:
            valor_match = re.search(pattern, text.lower())
            if valor_match:
                # Remove pontos de milhar e substitui vírgula por ponto
                valor_str = valor_match.group(1).replace('.', '').replace(',', '.')
                result["valor"] = valor_str
                break
        
        # Buscar data (formatos: DD/MM/YYYY, DD-MM-YYYY, etc.)
        fecha_patterns = [
            r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b',
            r'\b(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})\b'
        ]
        
        for pattern in fecha_patterns:
            fecha_match = re.search(pattern, text)
            if fecha_match:
                result["fecha"] = fecha_match.group(1)
                break
        
        # Buscar local/nombre del establecimiento
        # Geralmente é uma das primeiras linhas
        lines = text.split('\n')
        for line in lines[:5]:  # Nas primeiras 5 linhas
            if len(line.strip()) > 5 and not line.strip().isdigit():
                if result["local"] is None:
                    result["local"] = line.strip()
                    break
        
        return result

ocr_service = OCRService()
