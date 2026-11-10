#!/usr/bin/env python3
"""Build a minimal valid sRGB ICC profile, pure Python, stdlib only.

The export pipeline needs a real sRGB ICC profile to embed in JPG
exports, and no sRGB ICC profile file exists on this machine, so this
module builds the profile bytes from the published sRGB numbers instead
of shipping a binary blob or a new dependency.

Profile: ICC v2, display class ("mntr"), RGB input, XYZ PCS, D50
illuminant, sRGB primaries, and the sRGB tone response as a 1024 entry
curve. Description tag: "sRGB IEC61966-2.1".

Nothing here is a secret and nothing is fetched: every number is a
constant in this file, and the output is deterministic.
"""
import struct

PROFILE_DESCRIPTION = "sRGB IEC61966-2.1"

# sRGB primaries in the D50 PCS, from IEC 61966-2-1, as (X, Y, Z).
_SRGB_R_XYZ = (0.4360657, 0.2224884, 0.0139160)
_SRGB_G_XYZ = (0.3851471, 0.7168731, 0.0970767)
_SRGB_B_XYZ = (0.1430660, 0.0606072, 0.7140963)
# D50 white point.
_D50_XYZ = (0.9642, 1.0, 0.8249)


def _s15fixed16(value):
    """Encode a float as a signed 15.16 fixed point big endian value."""
    return struct.pack(">i", round(value * 65536))


def _xyz_tag(xyz):
    """An xyzType tag: signature "XYZ ", reserved zero, three values."""
    return b"XYZ " + b"\x00\x00\x00\x00" + b"".join(_s15fixed16(v) for v in xyz)


def _text_tag(text):
    """A textType tag: signature "text", reserved zero, ASCII, NUL end."""
    body = text.encode("ascii") + b"\x00"
    tag = b"text" + b"\x00\x00\x00\x00" + body
    return tag + b"\x00" * ((4 - len(tag) % 4) % 4)


def _desc_tag(text):
    """A textDescriptionType tag with an ASCII description only.

    Layout: signature "desc", reserved zero, ASCII count (with NUL),
    ASCII text, Unicode language code, Unicode count zero, ScriptCode
    code zero, ScriptCode count zero.
    """
    body = text.encode("ascii") + b"\x00"
    tag = (
        b"desc"
        + b"\x00\x00\x00\x00"
        + struct.pack(">I", len(body))
        + body
        + struct.pack(">H", 0x656E)  # "en"
        + struct.pack(">I", 0)
        + struct.pack(">H", 0)
        + b"\x00"
    )
    return tag + b"\x00" * ((4 - len(tag) % 4) % 4)


def _srgb_trc_table(entries=1024):
    """The sRGB tone response curve as unsigned 16 bit table entries.

    Each entry maps an encoded value to linear light: v / 12.92 below
    0.04045, else ((v + 0.055) / 1.055) to the power 2.4.
    """
    table = []
    for i in range(entries):
        v = i / (entries - 1)
        if v <= 0.04045:
            linear = v / 12.92
        else:
            linear = ((v + 0.055) / 1.055) ** 2.4
        table.append(round(linear * 65535))
    return table


def _curve_tag():
    """A curveType tag holding the sRGB tone response table."""
    table = _srgb_trc_table()
    tag = (
        b"curv"
        + b"\x00\x00\x00\x00"
        + struct.pack(">I", len(table))
        + b"".join(struct.pack(">H", entry) for entry in table)
    )
    return tag


def srgb_icc_profile_bytes():
    """Return the bytes of a minimal valid sRGB ICC profile."""
    tags = [
        (b"desc", _desc_tag(PROFILE_DESCRIPTION)),
        (b"cprt", _text_tag(PROFILE_DESCRIPTION)),
        (b"wtpt", _xyz_tag(_D50_XYZ)),
        (b"bkpt", _xyz_tag((0.0, 0.0, 0.0))),
        (b"rXYZ", _xyz_tag(_SRGB_R_XYZ)),
        (b"gXYZ", _xyz_tag(_SRGB_G_XYZ)),
        (b"bXYZ", _xyz_tag(_SRGB_B_XYZ)),
        (b"rTRC", _curve_tag()),
        (b"gTRC", _curve_tag()),
        (b"bTRC", _curve_tag()),
    ]
    header_size = 128
    table_size = 4 + 12 * len(tags)
    offset = header_size + table_size
    entries = []
    blobs = []
    for signature, blob in tags:
        entries.append((signature, offset, len(blob)))
        blobs.append(blob)
        offset += len(blob)
    total_size = offset

    header = bytearray(128)
    header[0:4] = struct.pack(">I", total_size)
    header[4:8] = b"lcms"
    header[8:12] = struct.pack(">I", 0x02100000)  # ICC version 2.1.0
    header[12:16] = b"mntr"
    header[16:20] = b"RGB "
    header[20:24] = b"XYZ "
    # Creation date: year, month, day, hour, minute, second.
    header[24:36] = struct.pack(">6H", 2026, 11, 10, 0, 0, 0)
    header[36:40] = b"acsp"
    header[40:44] = struct.pack(">I", 0)  # primary platform
    header[44:48] = struct.pack(">I", 0)  # flags
    header[48:52] = struct.pack(">I", 0)  # device manufacturer
    header[52:56] = struct.pack(">I", 0)  # device model
    # Bytes 56 to 63: device attributes, zero.
    header[64:68] = struct.pack(">I", 0)  # rendering intent, perceptual
    header[68:80] = b"".join(_s15fixed16(v) for v in _D50_XYZ)

    table = struct.pack(">I", len(tags))
    for signature, tag_offset, tag_size in entries:
        table += signature + struct.pack(">II", tag_offset, tag_size)

    return bytes(header) + table + b"".join(blobs)


if __name__ == "__main__":
    import sys

    data = srgb_icc_profile_bytes()
    if len(sys.argv) == 2:
        with open(sys.argv[1], "wb") as handle:
            handle.write(data)
    print(f"{len(data)} bytes, description: {PROFILE_DESCRIPTION}")
