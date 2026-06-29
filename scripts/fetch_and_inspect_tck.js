const fs = require('fs');
const path = require('path');

const url = "https://raw.githubusercontent.com/fatihdx/turk-ceza-hukuku-json/main/TCK_5237.json";

console.log("Fetching TCK JSON...");
fetch(url)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  })
  .then(data => {
    console.log("TCK JSON fetched successfully!");
    console.log("Data type:", typeof data);
    if (Array.isArray(data)) {
      console.log("It is an Array of length:", data.length);
      if (data.length > 0) {
        console.log("Sample item keys:", Object.keys(data[0]));
        console.log("Sample item:", JSON.stringify(data[0], null, 2).substring(0, 500));
      }
    } else {
      console.log("It is an Object with keys:", Object.keys(data));
      // Let's inspect top-level keys
      for (const key of Object.keys(data).slice(0, 5)) {
        console.log(`Key: ${key}, type: ${typeof data[key]}`);
        if (Array.isArray(data[key])) {
          console.log(`  It is an array of length ${data[key].length}`);
          if (data[key].length > 0) {
            console.log(`  Sample:`, JSON.stringify(data[key][0]).substring(0, 300));
          }
        }
      }
    }
  })
  .catch(err => {
    console.error("Error fetching or parsing:", err);
  });
