use std::{fs, path::Path};

fn main() {
    write_runtime_icon();
    tauri_build::build();
}

fn write_runtime_icon() {
    let icon_path = Path::new("icons/icon.ico");
    fs::create_dir_all("icons").expect("failed to create icons directory");
    fs::write(icon_path, make_ico(&[16, 32, 64, 128])).expect("failed to write generated icon.ico");
}

fn make_ico(sizes: &[u32]) -> Vec<u8> {
    let images: Vec<Vec<u8>> = sizes.iter().map(|size| make_dib(*size)).collect();
    let header_size = 6 + (sizes.len() * 16) as u32;
    let mut image_offset = header_size;
    let mut bytes = Vec::new();

    write_u16(&mut bytes, 0); // reserved
    write_u16(&mut bytes, 1); // icon type
    write_u16(&mut bytes, sizes.len() as u16);

    for (index, size) in sizes.iter().enumerate() {
        let image = &images[index];
        bytes.push(if *size >= 256 { 0 } else { *size as u8 });
        bytes.push(if *size >= 256 { 0 } else { *size as u8 });
        bytes.push(0); // color count
        bytes.push(0); // reserved
        write_u16(&mut bytes, 1); // color planes
        write_u16(&mut bytes, 32); // bits per pixel
        write_u32(&mut bytes, image.len() as u32);
        write_u32(&mut bytes, image_offset);
        image_offset += image.len() as u32;
    }

    for image in images {
        bytes.extend_from_slice(&image);
    }

    bytes
}

fn make_dib(size: u32) -> Vec<u8> {
    const HEADER_SIZE: u32 = 40;
    let xor_size = size * size * 4;
    let and_stride = ((size + 31) / 32) * 4;
    let and_size = and_stride * size;

    let mut bytes = Vec::with_capacity((HEADER_SIZE + xor_size + and_size) as usize);
    write_u32(&mut bytes, HEADER_SIZE);
    write_i32(&mut bytes, size as i32);
    write_i32(&mut bytes, (size * 2) as i32); // xor bitmap + and mask
    write_u16(&mut bytes, 1);
    write_u16(&mut bytes, 32);
    write_u32(&mut bytes, 0); // BI_RGB
    write_u32(&mut bytes, xor_size);
    write_i32(&mut bytes, 0);
    write_i32(&mut bytes, 0);
    write_u32(&mut bytes, 0);
    write_u32(&mut bytes, 0);

    for y in (0..size).rev() {
        for x in 0..size {
            let (r, g, b, a) = icon_pixel(size, x, y);
            bytes.extend_from_slice(&[b, g, r, a]);
        }
    }

    bytes.extend(std::iter::repeat(0).take(and_size as usize));
    bytes
}

fn icon_pixel(size: u32, x: u32, y: u32) -> (u8, u8, u8, u8) {
    let s = size as f32;
    let fx = (x as f32 + 0.5) / s;
    let fy = (y as f32 + 0.5) / s;
    let dx = fx - 0.5;
    let dy = fy - 0.5;
    let dist = (dx * dx + dy * dy).sqrt();

    if dist > 0.5 {
        return (0, 0, 0, 0);
    }

    let t = (fx * 0.62 + fy * 0.38).clamp(0.0, 1.0);
    let mut r = lerp(0x18, 0x5e, t);
    let mut g = lerp(0x31, 0x9d, t);
    let mut b = lerp(0x26, 0x79, t);
    let a = 255;

    if dist > 0.465 {
        r = 0x18;
        g = 0x31;
        b = 0x26;
    } else if dist > 0.425 {
        r = 0xd9;
        g = 0xea;
        b = 0xd8;
    }

    let highlight = ((fx - 0.33).powi(2) / 0.055) + ((fy - 0.24).powi(2) / 0.025) < 1.0;
    if highlight {
        r = mix(r, 0xff, 0.36);
        g = mix(g, 0xfd, 0.36);
        b = mix(b, 0xf5, 0.36);
    }

    if is_logo_letter(fx, fy) {
        r = 0xff;
        g = 0xfd;
        b = 0xf5;
    }

    (r, g, b, a)
}

fn is_logo_letter(fx: f32, fy: f32) -> bool {
    let l_stem = fx > 0.245 && fx < 0.335 && fy > 0.30 && fy < 0.70;
    let l_foot = fx > 0.245 && fx < 0.505 && fy > 0.615 && fy < 0.705;

    let r_stem = fx > 0.535 && fx < 0.625 && fy > 0.30 && fy < 0.70;
    let r_top = fx > 0.535 && fx < 0.755 && fy > 0.30 && fy < 0.39;
    let r_mid = fx > 0.535 && fx < 0.735 && fy > 0.47 && fy < 0.56;
    let r_outer = fx > 0.700 && fx < 0.800 && fy > 0.36 && fy < 0.50;
    let r_leg = fx > 0.615 && fx < 0.805 && fy > 0.53 && fy < 0.74
        && (fy - (0.50 + (fx - 0.61) * 0.95)).abs() < 0.045;

    l_stem || l_foot || r_stem || r_top || r_mid || r_outer || r_leg
}

fn lerp(from: u8, to: u8, t: f32) -> u8 {
    (from as f32 + (to as f32 - from as f32) * t).round() as u8
}

fn mix(from: u8, to: u8, amount: f32) -> u8 {
    lerp(from, to, amount)
}

fn write_u16(bytes: &mut Vec<u8>, value: u16) {
    bytes.extend_from_slice(&value.to_le_bytes());
}

fn write_u32(bytes: &mut Vec<u8>, value: u32) {
    bytes.extend_from_slice(&value.to_le_bytes());
}

fn write_i32(bytes: &mut Vec<u8>, value: i32) {
    bytes.extend_from_slice(&value.to_le_bytes());
}
