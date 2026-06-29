const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"
];

const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

function convertLessThanThousand(num: number): string {
  if (num === 0) return "";
  
  let str = "";
  
  if (num >= 100) {
    str += ones[Math.floor(num / 100)] + " Hundred ";
    num %= 100;
  }
  
  if (num >= 20) {
    str += tens[Math.floor(num / 10)] + " ";
    num %= 10;
  }
  
  if (num > 0) {
    str += ones[num] + " ";
  }
  
  return str.trim();
}

export function numberToWords(amount: number): string {
  if (isNaN(amount) || amount === null) return "";
  
  // Format to 2 decimal places to prevent float precision issues
  const formatted = amount.toFixed(2);
  const parts = formatted.split(".");
  const rupeesPart = parseInt(parts[0], 10);
  const paisePart = parseInt(parts[1], 10);
  
  if (rupeesPart === 0 && paisePart === 0) {
    return "Zero Rupees Only";
  }
  
  let result = "";
  
  if (rupeesPart > 0) {
    let temp = rupeesPart;
    
    const crore = Math.floor(temp / 10000000);
    temp %= 10000000;
    
    const lakh = Math.floor(temp / 100000);
    temp %= 100000;
    
    const thousand = Math.floor(temp / 1000);
    temp %= 1000;
    
    const remaining = temp;
    
    if (crore > 0) {
      result += numberToWords(crore).replace(" Rupees Only", "").replace(" Only", "") + " Crore ";
    }
    
    if (lakh > 0) {
      result += convertLessThanThousand(lakh) + " Lakh ";
    }
    
    if (thousand > 0) {
      result += convertLessThanThousand(thousand) + " Thousand ";
    }
    
    if (remaining > 0) {
      result += convertLessThanThousand(remaining) + " ";
    }
    
    result = result.trim();
    if (rupeesPart === 1) {
      result += " Rupee";
    } else {
      result += " Rupees";
    }
  }
  
  if (paisePart > 0) {
    const paiseWords = convertLessThanThousand(paisePart);
    if (result) {
      result += " and " + paiseWords + " Paise";
    } else {
      result += paiseWords + " Paise";
    }
  }
  
  return (result + " Only").trim().replace(/\s+/g, " ");
}
