const fs = require('fs');
const path = 'c:/Users/Taban-pc/Desktop/Taban Projects/TABAN BILLING/TABAN BILLING/src/pages/Product-Calalog/coupons/couponsListPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /{type === "Coupons" \? \([\s\S]*?\) : \([\s\S]*?\)}/m;

const replacement = `{type === "Addons" ? (
          <>
            <div className="w-32">Addon Code</div>
            <div className="w-24">Status</div>
            <div className="w-32">Price</div>
            <div className="w-32 text-right"><Search size={14} className="inline" /></div>
          </>
        ) : (
          <>
            <div className="w-32">Plan Code</div>
            <div className="w-24">Status</div>
            <div className="w-32">Price</div>
            <div className="w-32 text-right"><Search size={14} className="inline" /></div>
          </>
        )}`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content);
console.log('Fixed couponsListPage.tsx');
