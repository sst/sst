import { useAtom } from "jotai";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useHotkey } from "@react-hook/hotkey";
import {
  useBucketList,
  useBucketListPrefetch,
  useBucketSignedUrl,
  useUploadFile,
} from "~/data/aws";
import { styled } from "~/stitches.config";
import {
  AiOutlineFile,
  AiOutlineFolderOpen,
  AiOutlineArrowLeft,
  AiOutlineFileImage,
  AiFillCloseCircle,
  AiOutlineUpload,
  AiOutlinePlus,
  AiOutlineMenu,
  AiOutlineClose,
} from "react-icons/ai";
import { Button, Row, Spacer, Spinner, Toast, useOnScreen } from "~/components";
import { useEffect, useMemo, useRef, useState } from "react";

import { fileAtom } from "../hooks";
import { BiCopy, BiTrash } from "react-icons/bi";

const Root = styled("div", {
  height: "100%",
  display: "flex",
  flexDirection: "column",
});

const Toolbar = styled("div", {
  background: "$border",
  flexShrink: 0,
  fontSize: "$sm",
  gap: "$sm",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 $md",
  height: 46,
  "& svg": {
    color: "$hiContrast",
  },
});

const ToolbarNav = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "$sm",
});

const ToolbarRight = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "$md",
  flexShrink: 0,
});

const ToolbarButton = styled("div", {
  fontSize: "$sm",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  "& svg": {
    marginRight: "$sm",
  },
});

const Explorer = styled("div", {
  flexGrow: 1,
  overflow: "hidden",
  overflowY: "auto",
});

const ExplorerRow = styled("div", {
  color: "$hiContrast",
  padding: "0 $md",
  fontSize: "$sm",
  display: "flex",
  alignItems: "center",
  borderBottom: "1px solid $border",
  height: 40,
  "& > svg": {
    color: "$highlight",
  },
  variants: {
    active: {
      true: {
        background: "$border",
      },
    },
  },
});
const ExplorerKey = styled("div", {});
const ExplorerCreateInput = styled("input", {
  background: "transparent",
  color: "$hiContrast",
  border: 0,
  outline: 0,
  fontFamily: "$sans",
  flexGrow: 1,
});

const LogLoader = styled("div", {
  width: "100%",
  // background: "$border",
  // textAlign: "center",
  padding: "$md",
  fontWeight: 600,
  fontSize: "$sm",
  // borderRadius: "6px",
});

const PreviewCard = styled("div", {
  padding: "$md",
  border: "1px solid $highlight",
  display: "flex",
  flexDirection: "column",
  gap: "$md",
  minHeight: "50%",
  position: "fixed",
  width: 300,
  right: 20,
  bottom: 20,
  background: "$loContrast",
  borderRadius: 5,
  boxShadow: "0px 4px 6px hsla(0, 0%, 0%, 0.2)",
});

const Image = styled("img", {
  width: "200px",
  objectFit: "cover",
  aspectRatio: 1,
  margin: "0 auto",
});

const Heading = styled("h3", {
  fontSize: "$sm",
  fontWeight: 600,
  color: "$hiContrast",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  textAlign: "left",
});

const PreviewTitle = styled(Heading, {
  color: "$highlight",
  fontSize: "$md",
  padding: "$sm 0",
});

const Caption = styled("p", {
  fontSize: "$sm",
  color: "$hiContrast",
  opacity: 0.6,
  textAlign: "left",
});

const OptionRow = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "$md",
});

const CloseIcon = styled("div", {
  position: "absolute",
  right: 10,
  top: 10,
  cursor: "pointer",
});

interface currentFileProps {
  ETag: string;
  Key: string;
  LastModified: Date;
  Size: number;
  StorageClass: string;
  Owner: string;
}

const removeHashFromUrl = () => {
  const uri = window.location.toString();
  if (uri.indexOf("#") > 0) {
    const clean_uri = uri.substring(0, uri.indexOf("#"));
    window.history.replaceState({}, document.title, clean_uri);
  }
};

export function Detail() {
  const params = useParams<{ bucket: string; "*": string }>();
  const navigate = useNavigate();
  const prefix = params["*"]!;
  const bucketList = useBucketList(params.bucket!, prefix!);
  const prefetch = useBucketListPrefetch();
  const uploadFile = useUploadFile();
  const [index, setIndex] = useState(-1);
  // TODO: show preview card even if the user reloads the page
  const [selectedFile, setSelectedFile] = useAtom(fileAtom);
  const ref: any = useRef<HTMLDivElement>(null);
  const loaderVisible = useOnScreen(ref);
  const [currentFile, setCurrentFile] = useState<currentFileProps | null>();

  const closePreview = () => {
    setCurrentFile(null);
    removeHashFromUrl();
  };

  const url = useBucketSignedUrl({
    bucket: params.bucket!,
    key: currentFile?.Key || "",
    etag: currentFile?.ETag || "",
  });

  const up = useMemo(() => {
    const splits = prefix.split("/").filter((x) => x);
    splits.pop();
    const result = splits.join("/");
    return result ? result + "/" : result;
  }, [prefix]);

  useHotkey(window, ["a"], (e) => {
    if (isCreating) return;
    setIsCreating(true);
    e.preventDefault();
  });

  useHotkey(window, ["esc"], () => {
    if (isCreating) {
      setIsCreating(false);
      return;
    }
    navigate(up);
  });

  useHotkey(window, ["j"], () => {
    if (isCreating) return;
    setIndex((i) => i + 1);
  });

  useHotkey(window, ["k"], () => {
    if (isCreating) return;
    setIndex((i) => i - 1);
  });

  useEffect(() => setIndex(-1), [prefix]);
  useEffect(() => {
    if (loaderVisible && bucketList.hasNextPage) bucketList.fetchNextPage();
  }, [loaderVisible]);

  const [isCreating, setIsCreating] = useState(false);

  const list = useMemo(() => {
    if (!bucketList.data) return [];
    return bucketList.data.pages
      .flatMap((page) => [
        ...(page.CommonPrefixes?.map((x) => ({
          type: "dir" as const,
          sort: x.Prefix!,
          ...x,
        })) || []),
        ...(page.Contents?.map((x) => ({
          type: "file" as const,
          sort: x.Key!,
          ...x,
        })) || []),
      ])
      .filter((item) => item.sort !== prefix)
      .sort((a, b) => (a.sort < b.sort ? -1 : 1));
  }, [bucketList.data?.pages]);

  return (
    <Root>
      <Toolbar>
        <ToolbarNav>
          {prefix && (
            <Link to={up}>
              <AiOutlineArrowLeft />
            </Link>
          )}
          {prefix}
        </ToolbarNav>

        <ToolbarRight>
          <ToolbarButton onClick={() => setIsCreating(true)}>
            <AiOutlineFolderOpen size={16} />
            New Folder
          </ToolbarButton>

          <ToolbarButton>
            <AiOutlineUpload size={16} />
            <input
              type="file"
              id="upload"
              onChange={async (e) => {
                if (!e.target.files) return;
                await uploadFile.mutateAsync({
                  bucket: params.bucket!,
                  key: prefix + e.target.files[0].name,
                  payload: e.target.files[0],
                });
                bucketList.refetch();
              }}
              hidden
            />
            <label htmlFor="upload">Upload</label>
          </ToolbarButton>
        </ToolbarRight>
      </Toolbar>
      <Explorer>
        {isCreating && (
          <ExplorerRow>
            {uploadFile.isLoading ? (
              <Spinner size="sm" />
            ) : (
              <AiOutlineFolderOpen size={16} />
            )}
            <Spacer horizontal="sm" />
            <ExplorerCreateInput
              autoFocus
              placeholder="New folder name..."
              disabled={uploadFile.isLoading}
              onBlur={() => setIsCreating(false)}
              onKeyPress={async (e) => {
                // @ts-expect-error
                const value = e.target.value;
                const key = prefix + value.trim() + "/";
                if (e.key === "Enter") {
                  await uploadFile.mutateAsync({
                    bucket: params.bucket!,
                    key,
                  });
                  // @ts-expect-error
                  e.target.value = "";
                  setIsCreating(false);
                  navigate(key);
                }
              }}
            />
          </ExplorerRow>
        )}
        {list.map((item, i) => (
          <ExplorerRow
            active={i === index}
            onMouseOver={() => {
              if (item.type === "file") return;
              prefetch(params.bucket!, item.Prefix!);
            }}
            key={item.sort}
            as={Link}
            to={
              item.type === "file"
                ? prefix + `?file=${item.Key!}`
                : item.Prefix!
            }
          >
            {item.type === "dir" ? (
              <AiOutlineFolderOpen size={16} />
            ) : (
              <AiOutlineFile />
            )}
            <Spacer horizontal="sm" />
            <ExplorerKey>{item.sort.replace(prefix, "")}</ExplorerKey>
          </ExplorerRow>
        ))}
        {/* <Spacer horizontal="sm" />
              <ExplorerKey>{dir.Prefix!.replace(prefix, "")}</ExplorerKey>
            </ExplorerRow>
          ))} */}
        {bucketList.data?.pages
          .flatMap((x) => x.Contents || [])
          .filter((x) => x.Key !== prefix)
          .map((file) => (
            <ExplorerRow
              key={file.Key}
              onClick={() => {
                setSelectedFile(file.Key!);
                setCurrentFile(file);
              }}
            >
              <AiOutlineFileImage size={16} />
              <Spacer horizontal="sm" />
              <ExplorerKey>{file.Key!.replace(prefix, "")}</ExplorerKey>
            </ExplorerRow>
          ))}
        <LogLoader ref={ref}>
          {bucketList.isError
            ? "No buckets"
            : bucketList.isFetchingNextPage
            ? "Loading..."
            : bucketList.data?.pages.length === 0 && prefix === ""
            ? "Bucket is empty"
            : bucketList.data?.pages.length === 1 && prefix !== ""
            ? "Folder is empty"
            : bucketList.hasNextPage
            ? "Load More"
            : "No more files"}
        </LogLoader>
      </Explorer>
      {currentFile && (
        <PreviewCard>
          <CloseIcon>
            <AiOutlineClose onClick={closePreview} color="#e27152" size={18} />
          </CloseIcon>
          <Image src={url.data} />
          <PreviewTitle>{currentFile?.Key.replace(prefix, "")}</PreviewTitle>
          <Caption>
            {currentFile?.Key.split(".").pop()} - {currentFile?.Size / 1000} KB
          </Caption>
          <Heading>Last modified</Heading>
          <Caption>{currentFile?.LastModified.toISOString()}</Caption>
          <OptionRow>
            <Button>Download</Button>
            <BiCopy
              onClick={() => {
                navigator.clipboard.writeText(url.data!);
                <Toast.Simple type="success">Copied to clipboard</Toast.Simple>;
              }}
              color="#e27152"
              size={18}
            />
            <BiTrash color="#e27152" size={18} />
          </OptionRow>
        </PreviewCard>
      )}
    </Root>
  );
}
