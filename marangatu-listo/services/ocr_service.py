import os
import google.generativeai as genai
from PIL import Image
import io
import json
from typing import Dict, Optional
from dotenv import load_dotenv

load_dotenv()

class OCRService:
    def __init__(self):
        """Inicializa o cliente Google Gemini"""
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY não encontrada nas variáveis de ambiente")
        
        genai.configure(api_key=api_key)
        
        # Configuração do modelo
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        self.generation_config = genai.GenerationConfig(
            temperature=0.1,
            top_p=1,
            top_k=32,
            max_output_tokens=2048,
        )

    def extract_data_from_image(self, image_bytes: bytes) -> Dict[str, Optional[str]]:
        """
        Extrai dados estruturados de uma imagem de factura usando Gemini
        
        Args:
            image_bytes: Bytes da imagem
            
        Returns:
            Dicionário com fecha, local, valor, ruc_emisor
        """
        try:
            # Carregar imagem
            image = Image.open(io.BytesIO(image_bytes))
            
            prompt = """
            Analise esta imagem de uma nota fiscal/factura do Paraguai e extraia os seguintes dados em formato JSON estrito:
            
            1. "fecha": Data da emissão (formato DD/MM/YYYY)
            2. "local": Nome do estabelecimento comercial
            3. "valor": Valor total da compra (apenas números, sem pontos de milhar, use ponto para decimais se houver. Ex: 150000)
            4. "ruc_emisor": RUC do emissor (formato XXXXXX-X)
            
            Se algum campo não estiver visível ou claro, retorne null.
            Responda APENAS o JSON, sem markdown ou explicações adicionais.
            """
            
            response = self.model.generate_content(
                [prompt, image],
                generation_config=self.generation_config
            )
            
            # Limpar resposta para garantir JSON válido
            text_response = response.text.strip()
            if text_response.startswith("```json"):
                text_response = text_response[7:]
            if text_response.endswith("```"):
                text_response = text_response[:-3]
            
            data = json.loads(text_response)
            
            # Garantir estrutura de retorno
            return {
                "fecha": data.get("fecha"),
                "local": data.get("local"),
                "valor": str(data.get("valor")) if data.get("valor") is not None else None,
                "ruc_emisor": data.get("ruc_emisor")
            }
            
        except Exception as e:
            print(f"Erro na extração com Gemini: {e}")
            return {
                "fecha": None,
                "local": None,
                "valor": None,
                "ruc_emisor": None
            }

    # Mantendo compatibilidade com o código anterior se necessário, 
    # mas o método principal agora é extract_data_from_image que faz tudo
    def extract_text_from_image(self, image_bytes: bytes) -> str:
        """Método legado/wrapper"""
        data = self.extract_data_from_image(image_bytes)
        return str(data)

    def parse_factura(self, text: str) -> Dict[str, Optional[str]]:
        """
        Método legado. No fluxo novo, o extract_data_from_image já retorna o dict.
        Se este método for chamado com o resultado de extract_text_from_image (que agora retorna string do dict),
        tentamos parsear de volta.
        """
        try:
            # Se o texto for uma representação de string de um dict, tenta converter
            if isinstance(text, dict):
                return text
            import ast
            return ast.literal_eval(text)
        except:
            return {
                "fecha": None,
                "local": None,
                "valor": None,
                "ruc_emisor": None
            }

ocr_service = OCRService()
