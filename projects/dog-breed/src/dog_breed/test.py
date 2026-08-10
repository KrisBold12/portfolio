from dog_breed.model import create_model
m = create_model()
for k, v in m.pretrained_cfg.items():
    print(f'{k:16} {v}')