import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_gradient(width, height, color1, color2, direction="horizontal"):
    base = Image.new("RGB", (width, height), color1)
    top = Image.new("RGB", (width, height), color2)
    mask = Image.new("L", (width, height))
    mask_data = []
    for y in range(height):
        for x in range(width):
            if direction == "horizontal":
                p = int(255 * (x / width))
            else:
                p = int(255 * (y / height))
            mask_data.append(p)
    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base

def get_font(size, bold=False):
    font_names = ["arialbd.ttf" if bold else "arial.ttf", "segoeuib.ttf" if bold else "segoeui.ttf"]
    for name in font_names:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()

def generate_all_banners():
    output_dir = os.path.join(os.path.dirname(__file__), "images")
    os.makedirs(output_dir, exist_ok=True)

    # -------------------------------------------------------------
    # 1. HERO FLASH SALE BANNER (DARK PATTERN: URGENCY & SCARCITY)
    # -------------------------------------------------------------
    w, h = 960, 280
    banner1 = create_gradient(w, h, (15, 23, 42), (30, 41, 59), "horizontal")
    d1 = ImageDraw.Draw(banner1)
    
    # Decorative accent line & glowing badge
    d1.rectangle([0, 0, 8, h], fill=(239, 68, 68)) # red left strip
    d1.rounded_rectangle([40, 30, 240, 70], radius=8, fill=(220, 38, 38))
    d1.text((55, 40), "LIMITED TIME SALE", fill=(255, 255, 255), font=get_font(18, True))
    
    # Main embedded dark pattern text
    d1.text((40, 95), "HURRY! ONLY 2 ITEMS LEFT IN STOCK", fill=(254, 202, 202), font=get_font(34, True))
    d1.text((40, 150), "Exclusive 60% checkout discount expires when timer ends", fill=(226, 232, 240), font=get_font(21))
    
    # Embedded urgency coupon card inside image
    d1.rounded_rectangle([40, 200, 460, 250], radius=6, fill=(185, 28, 28), outline=(252, 165, 165), width=1)
    d1.text((55, 215), "USE CODE: FLASH60 - HURRY BEFORE TIME RUNS OUT", fill=(255, 255, 255), font=get_font(15, True))

    # Right side decorative graphic badge
    d1.rounded_rectangle([720, 40, 910, 240], radius=16, fill=(30, 58, 138), outline=(59, 130, 246), width=2)
    d1.text((750, 70), "SAVE", fill=(147, 197, 253), font=get_font(18, True))
    d1.text((740, 100), "60%", fill=(255, 255, 255), font=get_font(52, True))
    d1.text((745, 180), "OFF TODAY", fill=(147, 197, 253), font=get_font(18, True))

    p1 = os.path.join(output_dir, "hero_flash_deal.jpg")
    banner1.save(p1, quality=95)
    print("Created:", p1)

    # -------------------------------------------------------------
    # 2. SOCIAL PROOF / HIGH DEMAND BADGE (DARK PATTERN: SOCIAL PROOF)
    # -------------------------------------------------------------
    w, h = 640, 220
    banner2 = create_gradient(w, h, (254, 243, 199), (253, 230, 138), "vertical")
    d2 = ImageDraw.Draw(banner2)
    d2.rounded_rectangle([0, 0, w-1, h-1], radius=12, outline=(217, 119, 6), width=2)

    # Alert header
    d2.rounded_rectangle([25, 22, 210, 60], radius=6, fill=(217, 119, 6))
    d2.text((40, 32), "HIGH DEMAND ITEM", fill=(255, 255, 255), font=get_font(16, True))

    # Dark pattern embedded text
    d2.text((25, 78), "43 people bought this exclusive deal in the last hour!", fill=(146, 64, 14), font=get_font(23, True))
    d2.text((25, 120), "Over 1,200 orders placed today - almost sold out", fill=(180, 83, 9), font=get_font(18))
    
    # Progress visual indicator
    d2.rounded_rectangle([25, 165, 520, 185], radius=6, fill=(254, 215, 170))
    d2.rounded_rectangle([25, 165, 470, 185], radius=6, fill=(220, 38, 38))
    d2.text((25, 192), "94% of reserved inventory claimed", fill=(185, 28, 28), font=get_font(13, True))

    p2 = os.path.join(output_dir, "social_proof_banner.jpg")
    banner2.save(p2, quality=95)
    print("Created:", p2)

    # -------------------------------------------------------------
    # 3. SNEAKING / VIP SUBSCRIPTION PASS (DARK PATTERN: SNEAKING/URGENCY)
    # -------------------------------------------------------------
    w, h = 640, 220
    banner3 = create_gradient(w, h, (243, 232, 255), (233, 213, 255), "horizontal")
    d3 = ImageDraw.Draw(banner3)
    d3.rounded_rectangle([0, 0, w-1, h-1], radius=12, outline=(147, 51, 234), width=2)

    d3.rounded_rectangle([25, 22, 230, 60], radius=6, fill=(126, 34, 206))
    d3.text((40, 32), "VIP REWARDS PASS", fill=(255, 255, 255), font=get_font(16, True))

    d3.text((25, 78), "Hurry! Join VIP free trial auto-renews at $19.99/mo", fill=(88, 28, 135), font=get_font(21, True))
    d3.text((25, 120), "Only 4 free trial spots remaining today", fill=(107, 33, 168), font=get_font(17))

    p3 = os.path.join(output_dir, "vip_subscription_banner.jpg")
    banner3.save(p3, quality=95)
    print("Created:", p3)

    # -------------------------------------------------------------
    # 4. NORMAL SAFE PRODUCT BANNER: HEADPHONES (CLEAN / SAFE)
    # -------------------------------------------------------------
    w, h = 640, 220
    banner4 = create_gradient(w, h, (241, 245, 249), (226, 232, 240), "vertical")
    d4 = ImageDraw.Draw(banner4)
    d4.rounded_rectangle([0, 0, w-1, h-1], radius=12, outline=(148, 163, 184), width=1)

    d4.rounded_rectangle([25, 22, 220, 60], radius=6, fill=(30, 41, 59))
    d4.text((40, 32), "OFFICIAL PRODUCT", fill=(255, 255, 255), font=get_font(16, True))

    d4.text((25, 78), "AeroTune Studio Pro Wireless Headphones", fill=(15, 23, 42), font=get_font(24, True))
    d4.text((25, 120), "Hybrid Active Noise Cancellation with 40-Hour Battery", fill=(51, 65, 85), font=get_font(18))
    d4.text((25, 160), "Includes 2-year official manufacturer warranty & USB-C cable", fill=(100, 116, 139), font=get_font(15))

    p4 = os.path.join(output_dir, "product_clean_headphones.jpg")
    banner4.save(p4, quality=95)
    print("Created:", p4)

    # -------------------------------------------------------------
    # 5. NORMAL SAFE PRODUCT BANNER: SMARTWATCH (CLEAN / SAFE)
    # -------------------------------------------------------------
    w, h = 640, 220
    banner5 = create_gradient(w, h, (240, 249, 255), (224, 242, 254), "vertical")
    d5 = ImageDraw.Draw(banner5)
    d5.rounded_rectangle([0, 0, w-1, h-1], radius=12, outline=(56, 189, 248), width=1)

    d5.rounded_rectangle([25, 22, 200, 60], radius=6, fill=(2, 132, 199))
    d5.text((40, 32), "NEW SPECIFICATION", fill=(255, 255, 255), font=get_font(16, True))

    d5.text((25, 78), "TitanTrack Sapphire Multisport GPS Watch", fill=(12, 74, 110), font=get_font(24, True))
    d5.text((25, 120), "AMOLED Display with 50M Water Resistance & ECG Sensor", fill=(3, 105, 161), font=get_font(18))
    d5.text((25, 160), "Compatible with iOS and Android devices", fill=(71, 85, 105), font=get_font(15))

    p5 = os.path.join(output_dir, "product_clean_watch.jpg")
    banner5.save(p5, quality=95)
    print("Created:", p5)

    # -------------------------------------------------------------
    # 6. NORMAL SAFE BRAND HERO BANNER (CLEAN / SAFE)
    # -------------------------------------------------------------
    w, h = 960, 200
    banner6 = create_gradient(w, h, (248, 250, 252), (241, 245, 249), "horizontal")
    d6 = ImageDraw.Draw(banner6)
    d6.rounded_rectangle([0, 0, w-1, h-1], radius=12, outline=(203, 213, 225), width=1)

    d6.text((40, 45), "Spring 2026 Tech & Lifestyle Collection", fill=(15, 23, 42), font=get_font(28, True))
    d6.text((40, 95), "Discover precision-crafted devices designed for everyday productivity", fill=(71, 85, 105), font=get_font(19))
    d6.text((40, 140), "Complimentary standard shipping on all domestic orders over $50", fill=(100, 116, 139), font=get_font(16))

    p6 = os.path.join(output_dir, "spring_collection_banner.jpg")
    banner6.save(p6, quality=95)
    print("Created:", p6)

if __name__ == "__main__":
    generate_all_banners()
