from io import BytesIO

import numpy as np
from PIL import Image

RESAMPLE = {"bicubic": Image.BICUBIC, "bilinear": Image.BILINEAR}


def preprocess(image_bytes: bytes, meta: dict, use_draft=True) -> np.ndarray:
    size = meta["input_size"][1]    # 224
    resize = int(size / meta["crop_pct"])   # 235
    resample = RESAMPLE[meta["interpolation"]]

    with Image.open(BytesIO(image_bytes)) as img:
        if use_draft:
            img.draft("RGB", (resize, resize)) # Before touching pixels
        img = img.convert("RGB")

        # 1. Resize: short side to 'resize', keeping the proportions
        w, h = img.size 
        if w < h: 
            new_w = resize
            new_h = int(h * resize / w)
        else: 
            new_w = int(w * resize / h)
            new_h = resize
        img = img.resize((new_w, new_h), resample)

        # 2. Center crop: size x size and center
        left = int(round((new_w - size) / 2))
        top = int(round((new_h - size) / 2))
        img = img.crop((left, top, left + size, top + size))

        # 3. Array float in [0, 1]
        arr = np.asarray(img, dtype=np.float32) / 255.0 # --> (224, 224, 3)

    # 4. HWC --> CHW
    arr = arr.transpose(2, 0, 1) # --> (3, 224, 224)

    # 5. Normalization, one value per channel
    mean = np.array(meta["mean"], dtype=np.float32).reshape(3, 1, 1)
    std = np.array(meta["std"], dtype=np.float32).reshape(3, 1, 1)
    arr = (arr - mean) / std

    # 6. Batch dimension
    return arr[np.newaxis, ...] # --> (1, 3, 224, 224)

