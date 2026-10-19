import qrcode
from PIL import Image, ImageDraw, ImageFont
import os

def create_standalone_high_risk_qr(output_path, qr_data="HIGH RISK - RESTRICTED"):
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=16,
        border=3,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)

    # Crimson Red QR code on pure white or transparent background
    qr_img = qr.make_image(fill_color="#D32F2F", back_color="#FFFFFF").convert("RGBA")
    w, h = qr_img.size

    # Add center badge
    draw = ImageDraw.Draw(qr_img)
    badge_size = int(w * 0.22)
    bx = (w - badge_size) // 2
    by = (h - badge_size) // 2

    draw.rounded_rectangle([bx, by, bx + badge_size, by + badge_size], radius=10, fill="#B71C1C", outline="#FFFFFF", width=4)

    # Exclamation mark / Warning icon
    cx = bx + badge_size // 2
    cy = by + badge_size // 2
    tri_h = int(badge_size * 0.6)
    draw.polygon([(cx, cy - tri_h // 2), (cx + tri_h // 2, cy + tri_h // 2), (cx - tri_h // 2, cy + tri_h // 2)], fill="#FFEB3B", outline="#000000", width=2)
    draw.line([(cx, cy - tri_h // 2 + 10), (cx, cy + 5)], fill="#000000", width=3)
    draw.ellipse([(cx - 2, cy + 9), (cx + 2, cy + 13)], fill="#000000")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    qr_img.save(output_path, "PNG")
    print(f"Generated standalone QR at: {output_path}")

def create_high_risk_qr_image(output_path, qr_data="ALERT: HIGH RISK ZONE - RESTRICTED ACCESS", title="HIGH RISK", subtitle="RESTRICTED ENTRY - AUTHORIZED PERSONNEL ONLY"):
    # Create QR Code with high error correction
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=12,
        border=2,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)

    # QR in bold red and black or stark dark red
    qr_img = qr.make_image(fill_color="#B30000", back_color="#FFFFFF").convert("RGBA")

    # Dimensions for poster
    card_width = 800
    card_height = 1000

    img = Image.new("RGBA", (card_width, card_height), "#0B0F19")
    draw = ImageDraw.Draw(img)

    # Draw hazard border (diagonal stripes)
    stripe_w = 20
    for i in range(-card_height, card_width + card_height, 40):
        draw.polygon([
            (i, 0),
            (i + stripe_w, 0),
            (i + stripe_w - card_height, card_height),
            (i - card_height, card_height)
        ], fill="#D32F2F")

    # Inner dark container
    margin = 24
    draw.rectangle([margin, margin, card_width - margin, card_height - margin], fill="#111827", outline="#FF4D4D", width=3)

    # Red Danger Header Box
    header_top = margin + 20
    header_height = 130
    draw.rectangle([margin + 20, header_top, card_width - margin - 20, header_top + header_height], fill="#D32F2F")

    try:
        font_large = ImageFont.truetype("arialbd.ttf", 52)
        font_med = ImageFont.truetype("arialbd.ttf", 26)
        font_sub = ImageFont.truetype("arial.ttf", 20)
        font_footer = ImageFont.truetype("arialbd.ttf", 18)
    except Exception:
        font_large = ImageFont.load_default()
        font_med = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        font_footer = ImageFont.load_default()

    # Draw Warning Triangle in header
    tri_x = margin + 60
    tri_y = header_top + 65
    draw.polygon([(tri_x, tri_y - 35), (tri_x + 35, tri_y + 30), (tri_x - 35, tri_y + 30)], fill="#FFF000", outline="#000000", width=3)
    draw.line([(tri_x, tri_y - 15), (tri_x, tri_y + 10)], fill="#000000", width=4)
    draw.ellipse([(tri_x - 3, tri_y + 17), (tri_x + 3, tri_y + 23)], fill="#000000")

    tri_r_x = card_width - margin - 60
    draw.polygon([(tri_r_x, tri_y - 35), (tri_r_x + 35, tri_y + 30), (tri_r_x - 35, tri_y + 30)], fill="#FFF000", outline="#000000", width=3)
    draw.line([(tri_r_x, tri_y - 15), (tri_r_x, tri_y + 10)], fill="#000000", width=4)
    draw.ellipse([(tri_r_x - 3, tri_y + 17), (tri_r_x + 3, tri_y + 23)], fill="#000000")

    # Header label
    draw.text((card_width // 2, header_top + 40), "DANGER", fill="#FFFFFF", font=font_large, anchor="mm")
    draw.text((card_width // 2, header_top + 95), "HIGH RISK AREA / ZONE", fill="#FFEBEE", font=font_med, anchor="mm")

    # Center QR Code white badge
    qr_w, qr_h = qr_img.size
    qr_bg_w = qr_w + 30
    qr_bg_h = qr_h + 30
    qr_x = (card_width - qr_bg_w) // 2
    qr_y = header_top + header_height + 40

    draw.rounded_rectangle([qr_x, qr_y, qr_x + qr_bg_w, qr_y + qr_bg_h], radius=16, fill="#FFFFFF", outline="#FF4D4D", width=4)
    img.paste(qr_img, (qr_x + 15, qr_y + 15), qr_img)

    # Center warning badge inside QR code
    center_box_size = 90
    center_box_x = qr_x + (qr_bg_w - center_box_size) // 2
    center_box_y = qr_y + (qr_bg_h - center_box_size) // 2
    draw.rounded_rectangle([center_box_x, center_box_y, center_box_x + center_box_size, center_box_y + center_box_size], radius=8, fill="#D32F2F", outline="#FFFFFF", width=3)
    c_tri_x = center_box_x + center_box_size // 2
    c_tri_y = center_box_y + center_box_size // 2
    draw.polygon([(c_tri_x, c_tri_y - 25), (c_tri_x + 25, c_tri_y + 20), (c_tri_x - 25, c_tri_y + 20)], fill="#FFEB3B", outline="#000000", width=2)
    draw.line([(c_tri_x, c_tri_y - 10), (c_tri_x, c_tri_y + 6)], fill="#000000", width=3)
    draw.ellipse([(c_tri_x - 2, c_tri_y + 11), (c_tri_x + 2, c_tri_y + 15)], fill="#000000")

    # Subtitle / instructions below QR code
    text_y = qr_y + qr_bg_h + 35
    draw.text((card_width // 2, text_y), "SCAN FOR SAFETY PROTOCOLS & STATUS", fill="#00F0FF", font=font_med, anchor="mm")
    draw.text((card_width // 2, text_y + 40), subtitle, fill="#E2E8F0", font=font_sub, anchor="mm")

    # Bottom notice bar
    footer_y = card_height - margin - 60
    draw.rectangle([margin + 20, footer_y, card_width - margin - 20, card_height - margin - 20], fill="#1F2937")
    draw.text((card_width // 2, footer_y + 20), "COMPLIANCE NOTICE: IMMEDIATE EVACUATION IF ALARM SOUNDS", fill="#F87171", font=font_footer, anchor="mm")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "PNG")
    print(f"Successfully generated high risk QR code image at: {output_path}")

if __name__ == "__main__":
    create_high_risk_qr_image(r"d:\Projects\HydroStat\assets\high_risk_qr_code.png")
    create_high_risk_qr_image(r"C:\Users\Jairaj\.gemini\antigravity\brain\863de58e-04e2-43a7-8cd6-3e8bee079fc0\high_risk_qr_code.png")
    create_standalone_high_risk_qr(r"d:\Projects\HydroStat\assets\high_risk_qr_standalone.png")
    create_standalone_high_risk_qr(r"C:\Users\Jairaj\.gemini\antigravity\brain\863de58e-04e2-43a7-8cd6-3e8bee079fc0\high_risk_qr_standalone.png")
