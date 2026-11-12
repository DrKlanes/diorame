"""Genera los iconos de archivo .dior (hoja con esquina doblada + simbolo Diorame + banda .dior).
Uso: python make_dior_file_icons.py <simbolo.png> <carpeta_salida>
Requiere Pillow. Tamaños: 16, 32, 48, 256 (los que declara file_handlers en manifest.webmanifest)."""
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

S = 1024
PURPLE = (81, 29, 101, 255)       # #511d65, theme_color de la PWA
PAPER = (251, 247, 239, 255)
FOLD = (226, 218, 203, 255)
EDGE = (190, 181, 166, 255)

def compose(symbol, small, with_text):
    x0, x1, y0, y1 = 170, 854, 40, 984
    fold = 200
    r = 40
    # forma de la hoja (rounded rect menos esquina superior derecha)
    mask = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=255)
    d.polygon([(x1 - fold, y0 - 5), (x1 + 5, y0 - 5), (x1 + 5, y0 + fold)], fill=0)
    d.polygon([(x1 - fold, y0), (x1, y0 + fold), (x1 - fold, y0 + fold)], fill=0)  # evita hueco
    # sombra suave
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sm = Image.new("L", (S, S), 0)
    sm.paste(mask, (0, 14))
    sm = sm.filter(ImageFilter.GaussianBlur(14))
    sh.putalpha(sm.point(lambda v: int(v * 0.35)))
    img = sh.copy()
    # borde + papel
    edge_mask = mask.filter(ImageFilter.MaxFilter(9))
    img.alpha_composite(Image.composite(Image.new("RGBA", (S, S), EDGE), Image.new("RGBA", (S, S), (0,0,0,0)), edge_mask))
    paper = Image.new("RGBA", (S, S), PAPER)
    img.alpha_composite(Image.composite(paper, Image.new("RGBA", (S, S), (0,0,0,0)), mask))
    # solapa doblada
    fl = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(fl).polygon([(x1 - fold, y0), (x1 - fold, y0 + fold), (x1, y0 + fold)], fill=FOLD)
    ImageDraw.Draw(fl).line([(x1 - fold, y0), (x1 - fold, y0 + fold), (x1, y0 + fold)], fill=EDGE, width=7)
    img.alpha_composite(fl)
    # banda morada inferior recortada a la hoja
    band_top = 810 if small else 770
    band = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(band).rectangle([x0, band_top, x1, y1], fill=PURPLE)
    bm = Image.new("L", (S, S), 0)
    bm.paste(band.split()[3], (0, 0))
    from PIL import ImageChops
    band.putalpha(ImageChops.multiply(bm, mask))
    img.alpha_composite(band)
    # simbolo
    sw = 620 if small else 560
    sh_ = round(symbol.height * sw / symbol.width)
    sym = symbol.resize((sw, sh_), Image.LANCZOS)
    cy = (y0 + fold + band_top) // 2 + (10 if small else 0)
    img.alpha_composite(sym, (512 - sw // 2, cy - sh_ // 2))
    # texto
    if with_text:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 118)
        t = ".DIOR"
        bb = ImageDraw.Draw(img).textbbox((0, 0), t, font=font)
        tw, th = bb[2] - bb[0], bb[3] - bb[1]
        cx = (x0 + x1) // 2
        cyb = (band_top + y1) // 2
        ImageDraw.Draw(img).text((cx - tw // 2 - bb[0], cyb - th // 2 - bb[1]), t, font=font, fill=(255, 255, 255, 255))
    return img

def main(sym_path, out):
    import os
    os.makedirs(out, exist_ok=True)
    symbol = Image.open(sym_path).convert("RGBA")
    big = compose(symbol, False, True)
    big.save(os.path.join(out, "_master-1024.png"))
    for size in (16, 32, 48, 256):
        small = size <= 48
        m = compose(symbol, small, size >= 256)
        # recorte vertical util: el lienzo es cuadrado, la hoja ocupa ~92% del alto
        im = m.resize((size, size), Image.LANCZOS)
        im.save(os.path.join(out, f"dior-file-{size}.png"), optimize=True)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
