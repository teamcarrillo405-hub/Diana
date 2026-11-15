// Immutable ONNX snapshots published by the Transformers.js maintainer.
// Upstream: OpenAI Whisper and Microsoft TrOCR (MIT). Model bytes are not bundled.
export const browserRecognitionModels = {
  "speech": {
    "id": "Xenova/whisper-tiny.en",
    "revision": "79fb389fc764e7c395bd330e9531d9d32ada7049",
    "label": "English speech",
    "bytes": 44500564,
    "files": {
      "added_tokens.json": {
        "bytes": 2082,
        "sha256": "598c98875c01fe7ebd08ba6779f052f1136de6d36d9e7b99e04b432f78ecb28d"
      },
      "config.json": {
        "bytes": 2202,
        "sha256": "37a1073be00d19118c06557896c7c148598f4d8277edc0f5bc07c9f5554839f1"
      },
      "generation_config.json": {
        "bytes": 1590,
        "sha256": "132c95ba9db45f4498f2eab3fea7c1d6a174005010f8f6b7d20cfd5e9795996b"
      },
      "merges.txt": {
        "bytes": 456318,
        "sha256": "1ce1664773c50f3e0cc8842619a93edc4624525b728b188a9e0be33b7726adc5"
      },
      "normalizer.json": {
        "bytes": 52666,
        "sha256": "bf1c507dc8724ca9cf9903640dacfb69dae2f00edee4f21ceba106a7392f26dd"
      },
      "onnx/decoder_model_merged_quantized.onnx": {
        "bytes": 30727382,
        "sha256": "dbb2e063b7fbc41d9803b9698f93ecb035c50cbb3fb87b56cb131e4a5eb99059"
      },
      "onnx/encoder_model_quantized.onnx": {
        "bytes": 10124913,
        "sha256": "8cc3c6f8563d1b3fbd2c5af9f64c2bed8b020bc593c402d1ef53b9f08fbf1b90"
      },
      "preprocessor_config.json": {
        "bytes": 339,
        "sha256": "a6a76d28c93edb273669eb9e0b0636a2bddbb1272c3261e47b7ca6dfdbac1b8d"
      },
      "quant_config.json": {
        "bytes": 2840,
        "sha256": "757dc2d96699ce44e209c63c79ee4d41758a4baff39de9c5bc59ad90de454e81"
      },
      "special_tokens_map.json": {
        "bytes": 1717,
        "sha256": "7da611d517fe29e77335b8d8384e71795fb7b37cbf95bdc3b5252fa7e09dd1f8"
      },
      "tokenizer.json": {
        "bytes": 2128494,
        "sha256": "c6ee8f089220a5b1188f6426456772572671c6141ae007eecb83c6a8349f5deb"
      },
      "tokenizer_config.json": {
        "bytes": 835,
        "sha256": "e082c1ad251541bf277967a703252cddd4bb37a71a43737e03d050c22ec08238"
      },
      "vocab.json": {
        "bytes": 999186,
        "sha256": "f6bd25a65e4e63ca31360e9fb11c7e4f9a391a78385d640acd814092dd6eee4f"
      }
    }
  },
  "handwriting_line": {
    "id": "Xenova/trocr-small-handwritten",
    "revision": "2432e24d184b1d964d07ed04f5d9e21d31a59141",
    "label": "Handwritten English line",
    "bytes": 69467490,
    "files": {
      "config.json": {
        "bytes": 4515,
        "sha256": "ab388d889bdead2a554fc77ae4899caabdb279318e660b457afd29394e8ee43d"
      },
      "generation_config.json": {
        "bytes": 185,
        "sha256": "cce308da91e0d656e07404c70d4b9c9f5839d426f679eff6fda6dcc0e727e3b6"
      },
      "onnx/decoder_model_merged_quantized.onnx": {
        "bytes": 40527613,
        "sha256": "51076aa396ab5939c4668db9de901ad51765094b4c05c4c8c1f8ae2012ba1e08"
      },
      "onnx/encoder_model_quantized.onnx": {
        "bytes": 23082942,
        "sha256": "2f29edbd925f8a49c9c7d1349895f960cf09d2efdc76fe23f957048d476e0d03"
      },
      "preprocessor_config.json": {
        "bytes": 465,
        "sha256": "70da3434c33eedb3b56caf4067851741dfeed02f67576dcc3c6407c2533bfaf0"
      },
      "sentencepiece.bpe.model": {
        "bytes": 1356293,
        "sha256": "6f5e2fefcf793761a76a6bfb8ad35489f9c203b25557673284b6d032f41043f4"
      },
      "special_tokens_map.json": {
        "bytes": 279,
        "sha256": "d5469a60db23249c7f8945013d78df30b44b6bf686c6bb4740f4223f77b1b535"
      },
      "tokenizer.json": {
        "bytes": 4494727,
        "sha256": "68bcb5468c854362a615f3d2ff6a5e4091a85f4c8198993ed9a30afe0b143737"
      },
      "tokenizer_config.json": {
        "bytes": 471,
        "sha256": "ce50304582ca15b925982e96dfe56548ddbaba89b584e73176d6bb3a5a0b4713"
      }
    }
  }
} as const;
export type BrowserRecognitionKind = keyof typeof browserRecognitionModels;
