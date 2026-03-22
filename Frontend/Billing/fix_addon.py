
import os

target_file = r"c:\Users\Taban-pc\Pictures\Full System\Frontend\Billing\src\pages\Product-Calalog\addons\NewAddon\NewAddon.tsx"

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace function body
old_body = """  try {
    const rows = JSON.parse(localStorage.getItem(PRODUCTS_STORAGE_KEY) || "[]");
    return dedupe(
      (Array.isArray(rows) ? rows : [])
        .filter((row: any) => !(row?.active === false || String(row?.status || "").toLowerCase() === "inactive"))
        .map((row: any) => String(row?.name || row?.displayName || row?.product || ""))
    );
  } catch {
    return [];
  }"""

new_body = """  try {
    const res = await productsAPI.list({ status: "active" });
    let names: string[] = [];
    if (res && (res as any).success && Array.isArray((res as any).data)) {
      names = (res as any).data.map((row: any) => String(row?.name || row?.displayName || row?.productName || row?.product || ""));
    } else {
      const rows = JSON.parse(localStorage.getItem(PRODUCTS_STORAGE_KEY) || "[]");
      names = (Array.isArray(rows) ? rows : [])
        .filter((row: any) => !(row?.active === false || String(row?.status || "").toLowerCase() === "inactive"))
        .map((row: any) => String(row?.name || row?.displayName || row?.product || ""));
    }
    return dedupe(names);
  } catch {
    return [];
  }"""

# Since I renamed it to fetchActiveProductNames, I'll update the callers too.

# Update function call in useEffect
old_load = """    const load = () => {
      const names = readActiveProductNames();"""

new_load = """    const load = async () => {
      const names = await fetchActiveProductNames();"""

# Update function call in onNewProductSaved
old_on_saved = """  const onNewProductSaved = () => {
    const names = readActiveProductNames();"""

new_on_saved = """  const onNewProductSaved = async () => {
    const names = await fetchActiveProductNames();"""

# Replace
if old_body in content:
    content = content.replace(old_body, new_body)
    print("Function body replaced")
else:
    print("Function body not found exactly")

if old_load in content:
    content = content.replace(old_load, new_load)
    print("load() replaced")
else:
    print("load() not found exactly")

if old_on_saved in content:
    content = content.replace(old_on_saved, new_on_saved)
    print("onNewProductSaved() replaced")
else:
    print("onNewProductSaved() not found exactly")

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)
