import os
from PIL import Image, ImageDraw, ImageFont

def generate_banners():
    output_dir = os.path.join(os.path.dirname(__file__), "images")
    os.makedirs(output_dir, exist_ok=True)

    # Helper function to get a font
    def get_font(size):
        try:
            return ImageFont.truetype("arial.ttf", size)
        except Exception:
            return ImageFont.load_default()

    # 1. Dark Pattern Image 1: Urgency & Scarcity Banner
    # Size: 800x220
    img1 = Image.new("RGB", (800, 220), color=(254, 242, 242)) # light red
    draw1 = ImageDraw.Draw(img1)
    
    # Border
    draw1.rectangle([0, 0, 799, 219], outline=(239, 68, 68), width=3)
    
    # Header tag
    draw1.rectangle([30, 25, 220, 65], fill=(220, 38, 38))
    draw1.text((45, 35), "FLASH SALE", fill=(255, 255, 255), font=get_font(20))
    
    # Main urgency text
    draw1.text((30, 85), "Hurry! Only 2 items left in stock", fill=(185, 28, 28), font=get_font(32))
    draw1.text((30, 140), "Special limited offer expires today", fill=(100, 100, 100), font=get_font(20))
    
    img1_path = os.path.join(output_dir, "banner_urgency.jpg")
    img1.save(img1_path, quality=95)
    print(f"Created: {img1_path}")

    # 2. Dark Pattern Image 2: Social Proof Banner
    # Size: 600x200
    img2 = Image.new("RGB", (600, 200), color=(254, 243, 199)) # warm yellow/amber
    draw2 = ImageDraw.Draw(img2)
    
    draw2.rectangle([0, 0, 599, 199], outline=(217, 119, 6), width=3)
    draw2.rectangle([25, 25, 230, 65], fill=(217, 119, 6))
    draw2.text((40, 35), "TRENDING NOW", fill=(255, 255, 255), font=get_font(18))
    
    draw2.text((25, 85), "52 people bought this exclusive deal", fill=(146, 64, 14), font=get_font(26))
    draw2.text((25, 135), "High demand - item almost sold out", fill=(120, 53, 15), font=get_font(18))
    
    img2_path = os.path.join(output_dir, "banner_social_proof.jpg")
    img2.save(img2_path, quality=95)
    print(f"Created: {img2_path}")

    # 3. Safe / Normal Banner
    # Size: 600x200
    img3 = Image.new("RGB", (600, 200), color=(240, 249, 255)) # soft blue
    draw3 = ImageDraw.Draw(img3)
    
    draw3.rectangle([0, 0, 599, 199], outline=(14, 165, 233), width=2)
    draw3.text((25, 45), "Premium Audio Wireless Headset", fill=(12, 74, 110), font=get_font(26))
    draw3.text((25, 95), "Active Noise Cancellation & 40H Battery", fill=(3, 105, 161), font=get_font(18))
    draw3.text((25, 140), "Standard 2-year manufacturer warranty included", fill=(71, 85, 105), font=get_font(16))
    
    img3_path = os.path.join(output_dir, "banner_normal.jpg")
    img3.save(img3_path, quality=95)
    print(f"Created: {img3_path}")

if __name__ == "__main__":
    generate_banners()
