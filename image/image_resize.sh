base_name=$1
bg_color=$2

if [ -z "$bg_color" ]; then
    bg_color=white
fi

size_list=`cat ${base_name}.conf | grep -v -e '^#'`
extent=0
content=1
state=0

for i in $size_list
do
    if [ $state -eq $content ]; then
        content_size=$i
        convert ${base_name}.png -thumbnail $content_size -quality 0 -gravity center -background $bg_color -extent $extent_size ${base_name}_${extent_size}_specific.png
        state=$extent
    else
        extent_size=$i
        state=$content
    fi
done
