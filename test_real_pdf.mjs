import fs from 'fs';
import pdf from 'pdf-parse';

async function testExtraction() {
  const pdfBuffer = fs.readFileSync('/home/ubuntu/upload/ilovepdf_merged.pdf');
  
  try {
    const data = await pdf(pdfBuffer);
    const text = data.text;
    
    console.log('=== ANALYZING SECTIONS ===\n');
    
    // Split by proposal
    const proposals = text.split('Estimate').slice(1);
    
    proposals.forEach((proposal, idx) => {
      console.log(`\n--- PROPOSAL ${idx + 1} ---`);
      
      const lines = proposal.split('\n');
      let inSection = false;
      let sectionType = '';
      const items = [];
      
      for (const line of lines) {
        const lower = line.toLowerCase().trim();
        
        // Find section header
        if (lower.includes('fabrication') && lower.includes('installation')) {
          inSection = true;
          sectionType = 'Fabrication and Installation';
          console.log(`Section found: ${sectionType}`);
          continue;
        }
        
        if (lower.includes('scope') && lower.includes('work')) {
          inSection = true;
          sectionType = 'Scope of Work';
          console.log(`Section found: ${sectionType}`);
          continue;
        }
        
        if (inSection) {
          // Stop at end markers
          if (lower.includes('the pricing') || lower.includes('please review') || 
              lower.includes('as part of') || lower.includes('total:') || 
              lower.includes('bolted iron') || lower.includes('office@')) {
            console.log(`End marker found: "${line.trim()}"`);
            break;
          }
          
          const sanitized = line.trim();
          if (sanitized && !/^[\d,$.]+$/.test(sanitized) && sanitized.length > 2) {
            items.push(sanitized);
          }
        }
      }
      
      console.log(`Items extracted: ${items.length}`);
      items.forEach((item, i) => {
        console.log(`  ${i + 1}. ${item}`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testExtraction();
