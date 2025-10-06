const Tesseract = require('tesseract.js');

async function testOCR() {
  console.log('Testing Tesseract.js...');
  
  try {
    // Create worker without logger to avoid serialization issues
    const worker = await Tesseract.createWorker();
    
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    console.log('Worker initialized successfully');
    
    // Test with a simple text image (you can replace this with any image URL)
    const { data } = await worker.recognize('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
    
    console.log('OCR Result:', data.text);
    console.log('Confidence:', data.confidence);
    
    await worker.terminate();
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('OCR Test failed:', error);
  }
}

testOCR();
