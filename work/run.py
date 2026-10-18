import pandas as pd
from fuzzywuzzy import process
import re
from pathlib import Path

# 1. โหลดข้อมูล (เปลี่ยนชื่อไฟล์ตามที่คุณใช้งานจริง)
# ใช้ Path(__file__).parent เพื่ออ้างอิงโฟลเดอร์ที่สคริปต์นี้อยู่
BASE_DIR = Path(__file__).parent

file_address = BASE_DIR / 'Address_v2.xlsx' 
file_customer = BASE_DIR / 'Bexsys_Template_Customer-Master.xlsx'
file_vendor = BASE_DIR / 'Bexsys_Template_Vendor_Master_UAT.xlsx'

df_address_dict = pd.read_excel(file_address, sheet_name=None)
df_customer = pd.read_excel(file_customer, sheet_name='ข้อมูลลูกค้า', header=1)
df_vendor = pd.read_excel(file_vendor, sheet_name='ข้อมูลผู้ขาย')

# 2. ฟังก์ชันล้างคำนำหน้า/ต่อท้ายบริษัท เพื่อให้เหลือแต่ "ชื่อ" ล้วนๆ
def clean_company_name(name):
    if pd.isna(name):
        return ""
    name = str(name).strip()
    
    # คำที่ต้องการตัดออกเพื่อให้เหลือแต่แก่นของชื่อ
    words_to_remove = [
        'บริษัท', 'จำกัด', 'มหาชน', 'บจก.', 'หจก.', 'บมจ.', 
        'สาขา', 'สำนักงานใหญ่', r'\(.*?\)', r'\.', 'ร้าน'
    ]
    for word in words_to_remove:
        name = re.sub(word, '', name, flags=re.IGNORECASE)
    return name.strip()

# 3. สร้าง Dictionary เก็บ CardCode และชื่อที่ผ่านการล้างคำแล้วจาก Master Files
master_dict = {}

# ดึงข้อมูล Master ลูกค้า
for _, row in df_customer.iterrows():
    if pd.notna(row['CardCode']) and pd.notna(row['CardName']):
        clean_name = clean_company_name(row['CardName'])
        if clean_name:
            master_dict[clean_name] = row['CardCode']

# ดึงข้อมูล Master ผู้ขาย
for _, row in df_vendor.iterrows():
    if pd.notna(row['CardCode']) and pd.notna(row['CardName']):
        clean_name = clean_company_name(row['CardName'])
        if clean_name:
            master_dict[clean_name] = row['CardCode']

master_names = list(master_dict.keys())

# 4. ฟังก์ชันสำหรับจับคู่และคืนค่า CardCode ที่ความแม่นยำสูงสุด
def match_cardcode(address_name):
    clean_addr_name = clean_company_name(address_name)
    if not clean_addr_name:
        return None
    
    # ใช้ fuzzy matching เพื่อหาชื่อที่ใกล้เคียงที่สุด (ตั้งเกณฑ์ความแม่นยำ > 80%)
    best_match, score = process.extractOne(clean_addr_name, master_names)
    if score >= 80:
        return master_dict[best_match]
    return None

# 5. อัปเดตไฟล์ Address ทุกๆ Sheet ที่มี
for sheet_name, df in df_address_dict.items():
    # สมมติว่าคอลัมน์ชื่อลูกค้าในไฟล์ Address ชื่อว่า 'Name'
    if 'Name' in df.columns: 
        # ใส่รหัส CardCode ลงในคอลัมน์แรกตามที่คุณต้องการ
        df['รหัส Master ลูกหนี้, เจ้าหนี้ CardCode'] = df['Name'].apply(match_cardcode)
        
# 6. บันทึกผลลัพธ์เป็นไฟล์ใหม่
output_file = BASE_DIR / 'Address_v2_Updated.xlsx'
with pd.ExcelWriter(output_file) as writer:
    for sheet_name, df in df_address_dict.items():
        df.to_excel(writer, sheet_name=sheet_name, index=False)

print("✅ อัปเดตข้อมูลเสร็จเรียบร้อย! เช็คไฟล์ Address_v2_Updated.xlsx ได้เลยครับ")