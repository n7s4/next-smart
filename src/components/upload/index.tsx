"use client";

import { FC, useState } from "react";
import { Upload, message, Progress } from "antd";
import type { UploadProps, UploadFile } from "antd";
import {
  InboxOutlined,
  FileTextOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { FileText, FileImage, FileVideo, FileArchive, X } from "lucide-react";

const { Dragger } = Upload;

interface FileUploadProps {
  maxSize?: number; // 单位：MB，默认 100MB
  maxCount?: number; // 最大上传数量，默认无限制
  accept?: string; // 接受的文件类型
  onUploadSuccess?: (fileList: UploadFile[]) => void;
  onUploadError?: (error: any) => void;
  uploadUrl?: string; // 自定义上传接口地址
  showUploadList?: boolean; // 是否显示上传列表
  onFilesChange?: (fileList: UploadFile[]) => void; // 文件列表变化回调
  disabled?: boolean; // 是否禁用
}

const FileUpload: FC<FileUploadProps> = ({
  maxSize = 100,
  maxCount,
  accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4,.mov,.avi",
  onUploadSuccess,
  onUploadError,
  uploadUrl = "/api/upload",
  showUploadList = true,
  onFilesChange,
  disabled = false,
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // 获取文件图标
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();

    if (["pdf"].includes(ext || "")) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (["doc", "docx"].includes(ext || "")) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext || "")) {
      return <FileImage className="w-5 h-5 text-green-500" />;
    }
    if (["mp4", "mov", "avi", "mkv"].includes(ext || "")) {
      return <FileVideo className="w-5 h-5 text-purple-500" />;
    }
    return <FileArchive className="w-5 h-5 text-gray-500" />;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const uploadProps: UploadProps = {
    name: "file",
    multiple: true,
    maxCount,
    accept,
    fileList,
    beforeUpload: (file) => {
      // 文件大小校验
      const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
      if (!isLtMaxSize) {
        message.error(`文件大小不能超过 ${maxSize}MB`);
        return Upload.LIST_IGNORE;
      }

      // 文件类型校验
      const acceptTypes = accept.split(",").map((t) => t.trim());
      const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!acceptTypes.includes(fileExt)) {
        message.error(`不支持的文件类型：${fileExt}`);
        return Upload.LIST_IGNORE;
      }

      // 阻止自动上传，仅添加到文件列表
      return false;
    },
    onChange: (info) => {
      setFileList(info.fileList);
      onFilesChange?.(info.fileList);
    },
    onDrop: (e) => {
      console.log("Dropped files", e.dataTransfer.files);
    },
    customRequest: async (options) => {
      const { file, onSuccess } = options;

      // 仅标记为成功，不实际上传
      // 真正的上传在创建知识库时由父组件统一处理
      setTimeout(() => {
        onSuccess?.({ url: "pending" });
      }, 100);
    },
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
      onFilesChange?.(newFileList);
    },
  };

  return (
    <div className="w-full">
      <Dragger
        {...uploadProps}
        disabled={disabled}
        className={`border-2 border-dashed rounded-xl transition-colors ${
          disabled ? "bg-gray-50 cursor-not-allowed" : "hover:border-blue-500"
        }`}
      >
        <p className="ant-upload-drag-icon flex justify-center">
          <InboxOutlined className="text-6xl text-blue-500" />
        </p>
        <p className="ant-upload-text text-gray-700 font-medium">
          点击或拖拽文件到此区域上传
        </p>
        <p className="ant-upload-hint text-gray-400 text-sm px-4">
          支持 PDF、Word、图片、视频等格式，单个文件不超过 {maxSize}MB
          {maxCount && `，最多上传 ${maxCount} 个文件`}
        </p>
      </Dragger>

      {/* 自定义文件列表 */}
      {showUploadList && fileList.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700 mb-3">
            已上传文件 ({fileList.length})
          </p>
          {fileList.map((file) => (
            <div
              key={file.uid}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <div className="shrink-0">{getFileIcon(file.name)}</div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate font-medium">
                  {file.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {formatFileSize(file.size || 0)}
                  </span>
                  {file.status === "uploading" && (
                    <Progress
                      percent={file.percent}
                      size="small"
                      className="flex-1"
                      strokeColor="#3b82f6"
                    />
                  )}
                  {file.status === "done" && (
                    <span className="text-xs text-green-600">✓ 上传成功</span>
                  )}
                  {file.status === "error" && (
                    <span className="text-xs text-red-600">✗ 上传失败</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  const index = fileList.indexOf(file);
                  const newFileList = fileList.slice();
                  newFileList.splice(index, 1);
                  setFileList(newFileList);
                }}
                className="shrink-0 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-all"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
