import json
import os
import re

chatscreen_path = r"c:\Users\anura\Desktop\Dxign Website 2\mobile\src\screens\ChatScreen.js"

# 1. Read clean ChatScreen.js
with open(chatscreen_path, "r", encoding="utf-8") as f:
    content = f.read()

# 2. Function to load step JSON
def load_step(step_num):
    path = rf"C:\Users\anura\.gemini\antigravity-ide\brain\c40c5d8a-b545-42cc-92f4-7d701ec3ba56\scratch\step_{step_num}.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

# --- APPLY STEP 64 ---
print("Applying Step 64...")
step64 = load_step(64)
chunks_str = step64["ReplacementChunks"]
if isinstance(chunks_str, str):
    # Use strict=False to ignore raw control chars like tabs/newlines inside JSON strings
    chunks = json.loads(chunks_str, strict=False)

print(f"Loaded {len(chunks)} chunks from Step 64.")
for idx, chunk in enumerate(chunks):
    target = chunk["TargetContent"]
    replacement = chunk["ReplacementContent"]
    
    # Standardize newlines
    target = target.replace('\r\n', '\n')
    replacement = replacement.replace('\r\n', '\n')
    content = content.replace('\r\n', '\n')
    
    if target in content:
        content = content.replace(target, replacement, 1)
        print(f"  Chunk {idx+1} replaced successfully.")
    else:
        print(f"  WARNING: Chunk {idx+1} target not found in content!")

# --- APPLY STEP 68 ---
print("Applying Step 68...")
step68 = load_step(68)
target = step68["TargetContent"].replace('\r\n', '\n')
replacement = step68["ReplacementContent"].replace('\r\n', '\n')
content = content.replace('\r\n', '\n')
if target in content:
    content = content.replace(target, replacement, 1)
    print("  Step 68 stylesheet replaced successfully.")
else:
    print("  WARNING: Step 68 stylesheet target not found!")

# --- APPLY STEP 94 ---
print("Applying Step 94...")
step94 = load_step(94)
target = step94["TargetContent"].replace('\r\n', '\n')
replacement = step94["ReplacementContent"].replace('\r\n', '\n')
content = content.replace('\r\n', '\n')
if target in content:
    content = content.replace(target, replacement, 1)
    print("  Step 94 stylesheet additions replaced successfully.")
else:
    print("  WARNING: Step 94 stylesheet additions target not found!")

# --- APPLY STEP 147 ---
print("Applying Step 147 (icon color contrast fixes)...")
step147 = load_step(147)
target = step147["TargetContent"].replace('\r\n', '\n')
replacement = step147["ReplacementContent"].replace('\r\n', '\n')
content = content.replace('\r\n', '\n')

# Check if target is in content. If not, step 147 was applied in our edit before restore.
# Since we restored the file, the target (which contains original icon codes) will definitely be there!
if target in content:
    content = content.replace(target, replacement, 1)
    print("  Step 147 icon colors replaced successfully.")
else:
    # Let's try to search manually if target is slightly different (e.g. carriage returns)
    print("  WARNING: Step 147 target not found! Let's do search without carriage returns.")

# 3. Write final content back to ChatScreen.js
with open(chatscreen_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Finished rebuilding ChatScreen.js!")
