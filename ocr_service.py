#!/usr/bin/env python3
"""
EasyOCR Service for TamanEdu
Provides high-quality OCR text extraction with image preprocessing
"""

import sys
import json
import argparse
import base64
from io import BytesIO
import cv2
import numpy as np
from PIL import Image
import easyocr

class OCRService:
    def __init__(self):
        """Initialize EasyOCR reader"""
        print("Initializing EasyOCR...", file=sys.stderr)
        self.reader = easyocr.Reader(['en'], gpu=False)  # English only for now
        print("EasyOCR initialized successfully", file=sys.stderr)
    
    def preprocess_image(self, image_path):
        """
        Preprocess image for better OCR results
        """
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not load image from {image_path}")
            
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply Gaussian blur to reduce noise
            blurred = cv2.GaussianBlur(gray, (3, 3), 0)
            
            # Apply adaptive thresholding
            thresh = cv2.adaptiveThreshold(
                blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            
            # Apply morphological operations to clean up
            kernel = np.ones((1, 1), np.uint8)
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            return cleaned
            
        except Exception as e:
            print(f"Error preprocessing image: {e}", file=sys.stderr)
            # Return original image if preprocessing fails
            return cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    
    def extract_text_from_image(self, image_path, preprocess=True):
        """
        Extract text from image using EasyOCR
        """
        try:
            print(f"Processing image: {image_path}", file=sys.stderr)
            
            # Preprocess image if requested
            if preprocess:
                processed_image = self.preprocess_image(image_path)
            else:
                processed_image = image_path
            
            # Run EasyOCR
            results = self.reader.readtext(processed_image)
            
            # Format results
            ocr_results = []
            for (bbox, text, confidence) in results:
                # Filter out very low confidence results
                if confidence > 0.1:  # EasyOCR confidence is already 0-1
                    ocr_results.append({
                        'text': text.strip(),
                        'confidence': confidence,
                        'bbox': {
                            'x0': int(bbox[0][0]),
                            'y0': int(bbox[0][1]),
                            'x1': int(bbox[2][0]),
                            'y1': int(bbox[2][1])
                        }
                    })
            
            print(f"Extracted {len(ocr_results)} text elements", file=sys.stderr)
            return ocr_results
            
        except Exception as e:
            print(f"Error extracting text: {e}", file=sys.stderr)
            return []
    
    def extract_text_from_base64(self, base64_string, preprocess=True):
        """
        Extract text from base64 encoded image
        """
        try:
            # Decode base64 image
            image_data = base64.b64decode(base64_string)
            image = Image.open(BytesIO(image_data))
            
            # Convert PIL image to OpenCV format
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Save temporarily for processing
            temp_path = "/tmp/temp_ocr_image.jpg"
            cv2.imwrite(temp_path, cv_image)
            
            # Process with OCR
            results = self.extract_text_from_image(temp_path, preprocess)
            
            # Clean up temp file
            import os
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            return results
            
        except Exception as e:
            print(f"Error processing base64 image: {e}", file=sys.stderr)
            return []

def main():
    parser = argparse.ArgumentParser(description='EasyOCR Service for TamanEdu')
    parser.add_argument('--image', help='Path to image file')
    parser.add_argument('--base64', help='Base64 encoded image data')
    parser.add_argument('--no-preprocess', action='store_true', help='Skip image preprocessing')
    parser.add_argument('--output-format', choices=['json', 'text'], default='json', help='Output format')
    
    args = parser.parse_args()
    
    if not args.image and not args.base64:
        print("Error: Must provide either --image or --base64", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Initialize OCR service
        ocr_service = OCRService()
        
        # Extract text
        if args.image:
            results = ocr_service.extract_text_from_image(args.image, not args.no_preprocess)
        else:
            results = ocr_service.extract_text_from_base64(args.base64, not args.no_preprocess)
        
        # Output results
        if args.output_format == 'json':
            print(json.dumps(results, indent=2))
        else:
            # Output just the text
            text_parts = [result['text'] for result in results]
            print('\n'.join(text_parts))
            
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
