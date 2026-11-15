"""Image-container boundary tests using opaque colors, no text or inference."""
import importlib.util
import io
from pathlib import Path
import unittest
from PIL import Image

spec = importlib.util.spec_from_file_location("recognize_local", Path(__file__).with_name("recognize_local.py"))
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)


def encode(image, format="PNG", orientation=None):
    output = io.BytesIO()
    options = {}
    if orientation is not None:
        exif = Image.Exif(); exif[274] = orientation
        options["exif"] = exif
    image.save(output, format=format, **options)
    return output.getvalue()


class LineInputTests(unittest.TestCase):
    def test_only_public_layout_failure_code_is_released(self):
        self.assertEqual(adapter.unavailable_response(ValueError("image_requires_horizontal_line_or_manual_entry")), {"error": "recognition_unsupported_layout", "manualEntryAvailable": True})
        self.assertEqual(adapter.unavailable_response(RuntimeError("private path or content")), {"error": "recognition_unavailable", "manualEntryAvailable": True})

    def test_horizontal_opaque_input_preserves_pixels(self):
        image = Image.new("RGB", (180, 40), (11, 22, 33))
        result = adapter.prepare_line_image(encode(image))
        self.assertEqual(result.size, (180, 40))
        self.assertEqual(result.tobytes(), image.tobytes())

    def test_portrait_and_square_inputs_require_manual_entry(self):
        for size in [(46, 118), (40, 40)]:
            with self.assertRaisesRegex(ValueError, "horizontal_line_or_manual_entry"):
                adapter.prepare_line_image(encode(Image.new("RGB", size)))

    def test_camera_exif_rotation_is_applied_before_shape_check(self):
        portrait = Image.new("RGB", (40, 180), (11, 22, 33))
        result = adapter.prepare_line_image(encode(portrait, "JPEG", 6))
        self.assertEqual(result.size, (180, 40))
        self.assertIsNone(result.getexif().get(274))

    def test_exif_180_preserves_correct_display_orientation(self):
        image = Image.new("RGB", (180, 40), (255, 255, 255))
        image.putpixel((0, 0), (11, 22, 33))
        result = adapter.prepare_line_image(encode(image, orientation=3))
        self.assertEqual(result.getpixel((179, 39)), (11, 22, 33))
        self.assertIsNone(result.getexif().get(274))

    def test_orientation_cannot_turn_portrait_text_into_supported_line(self):
        with self.assertRaisesRegex(ValueError, "horizontal_line_or_manual_entry"):
            adapter.prepare_line_image(encode(Image.new("RGB", (180, 40)), "JPEG", 6))

    def test_unsupported_container_and_pixel_bound_fail_closed(self):
        with self.assertRaisesRegex(ValueError, "image_bound"):
            adapter.prepare_line_image(encode(Image.new("RGB", (180, 40)), "GIF"))
        with self.assertRaisesRegex(ValueError, "image_bound"):
            adapter.prepare_line_image(encode(Image.new("RGB", (2500, 1700))))


if __name__ == "__main__":
    unittest.main()
