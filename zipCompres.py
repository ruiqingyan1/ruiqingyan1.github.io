# ch14_43.py


import os
import zipfile


def compress_files(source_dir, output_path):
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                # 获取当前文件在源目录中的路径
                source_file = os.path.join(root, file)

                # 计算相对于源目录的路径（作为压缩后的文件名）
                relative_path = os.path.relpath(source_file, start=source_dir)

                # 添加到压缩文件中
                zf.write(source_file, arcname=relative_path)


# 调用函数进行压缩
compress_files('./test34', './test34.zip')



# fileZip = zipfile.ZipFile('out41.zip','w')  # 压缩
# fileZip.extractall('out43.zip') 		    # 解压