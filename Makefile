IMG_BASENAMES = image/app/app_icon image/app/app_startup
IMG_BASES = $(shell for i in $(IMG_BASENAMES); do echo $$i | sed -e s/$$/.png/g; done)

.PHONY: all icons clean

all: icons

icons: $(IMG_BASES)
	./image/image_resize.sh image/app/app_icon
	./image/image_resize.sh image/app/app_startup "#44087a"

clean:
	rm image/app/*_specific.png