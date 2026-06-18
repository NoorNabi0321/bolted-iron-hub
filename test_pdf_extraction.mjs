import fs from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js';

async function testExtraction() {
  const pdfBuffer = fs.readFileSync('/home/ubuntu/upload/173LexingtonAvenueProposal#2133.pdf');
  
  try {
    const data = await pdf(pdfBuffer);
    const text = data.text;
    
    console.log('=== PDF TEXT EXTRACTED ===');
    console.log(text);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  }
}

testExtraction();
