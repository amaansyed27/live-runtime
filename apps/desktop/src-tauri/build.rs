use std::{fs, path::Path};

fn main() {
    ensure_default_windows_icon();
    tauri_build::build();
}

fn ensure_default_windows_icon() {
    let icon_path = Path::new("icons/icon.ico");
    if icon_path.exists() {
        return;
    }

    fs::create_dir_all("icons").expect("failed to create icons directory");
    fs::write(icon_path, make_default_icon()).expect("failed to write generated icon.ico");
}

fn make_default_icon() -> Vec<u8> {
    const WIDTH: u32 = 32;
    const HEIGHT: u32 = 32;
    const HEADER_SIZE: u32 = 40;
    const ICON_DIR_SIZE: u32 = 6;
    const ICON_ENTRY_SIZE: u32 = 16;
    const IMAGE_OFFSET: u32 = ICON_DIR_SIZE + ICON_ENTRY_SIZE;

    let xor_size = WIDTH * HEIGHT * 4;
    let and_stride = ((WIDTH + 31) / 32) * 4;
    let and_size = and_stride * HEIGHT;
    let dib_size = HEADER_SIZE + xor_size + and_size;

    let mut bytes = Vec::with_capacity((IMAGE_OFFSET + dib_size) as usize);

    write_u16(&mut bytes, 0); // reserved
    write_u16(&mut bytes, 1); // icon type
    write_u16(&mut bytes, 1); // image count

    bytes.push(WIDTH as u8);
    bytes.push(HEIGHT as u8);
    bytes.push(0); // color count
    bytes.push(0); // reserved
    write_u16(&mut bytes, 1); // color planes
    write_u16(&mut bytes, 32); // bits per pixel
    write_u32(&mut bytes, dib_size);
    write_u32(&mut bytes, IMAGE_OFFSET);

    write_u32(&mut bytes, HEADER_SIZE);
    write_i32(&mut bytes, WIDTH as i32);
    write_i32(&mut bytes, (HEIGHT * 2) as i32); // xor bitmap + and mask
    write_u16(&mut bytes, 1);
    write_u16(&mut bytes, 32);
    write_u32(&mut bytes, 0); // BI_RGB
    write_u32(&mut bytes, xor_size);
    write_i32(&mut bytes, 0);
    write_i32(&mut bytes, 0);
    write_u32(&mut bytes, 0);
    write_u32(&mut bytes, 0);

    for y in 0..HEIGHT {
        for x in 0..WIDTH {
            let edge = x < 3 || x > WIDTH - 4 || y < 3 || y > HEIGHT - 4;
            let (r, g, b) = if edge { (0x18, 0x31, 0x26) } else { (0x5e, 0x9d, 0x79) };
            bytes.extend_from_slice(&[b, g, r, 0xff]);
        }
    }

    bytes.extend(std::iter::repeat(0).take(and_size as usize));
    bytes
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
