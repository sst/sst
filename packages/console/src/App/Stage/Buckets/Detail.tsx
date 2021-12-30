import {
  Link,
  useNavigate,
  useSearchParams,
  useParams,
} from "react-router-dom";
import { useHotkeys } from "@react-hook/hotkey";
import {
  useBucketList,
  useBucketListPrefetch,
  useBucketSignedUrl,
  useDeleteFile,
  useUploadFile,
} from "~/data/aws";
import { styled } from "~/stitches.config";
import {
  AiOutlineFile,
  AiOutlineFolderOpen,
  AiOutlineArrowLeft,
  AiOutlineUpload,
  AiOutlineClose,
} from "react-icons/ai";
import { HiDotsVertical } from "react-icons/hi";
import {
  Button,
  DropdownMenu,
  Spacer,
  Spinner,
  useOnScreen,
} from "~/components";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BiCopy, BiTrash } from "react-icons/bi";
import { IoCheckmarkDone } from "react-icons/io5";
import { RiDragDropLine } from "react-icons/ri";
import "./dnd.css";
import { FileDrop } from "react-file-drop";
import { saveAs } from "file-saver";
import { atom, useAtom } from "jotai";

const Root = styled("div", {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  position: "relative",
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

const ExplorerRowToolbar = styled("div", {
  flexShrink: 0,
  display: "flex",
  gap: "$sm",
  opacity: 0,
  transition: "200ms all",
  "& *": {
    color: "$highlight",
  },
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
  [`&:hover ${ExplorerRowToolbar}`]: {
    opacity: 0,
  },
  variants: {
    active: {
      true: {
        background: "$border",
      },
    },
  },
});

const ExplorerRowSpinner = styled(Spinner, {
  marginRight: -5,
});

const ExplorerKey = styled("div", {
  flexGrow: 1,
});
const ExplorerCreateInput = styled("input", {
  background: "transparent",
  color: "$hiContrast",
  border: 0,
  outline: 0,
  fontFamily: "$sans",
  flexGrow: 1,
  fontSize: "$sm",
});

const Pager = styled("div", {
  width: "100%",
  padding: "$md",
  fontWeight: 600,
  fontSize: "$sm",
});

const PreviewCard = styled("div", {
  padding: "$md",
  border: "1px solid $border",
  display: "flex",
  flexDirection: "column",
  gap: "$md",
  position: "fixed",
  width: 300,
  right: 20,
  bottom: 20,
  background: "$loContrast",
  borderRadius: 5,
  boxShadow: "0px 6px 10px hsla(0, 0%, 0%, 0.2)",
});

const Image = styled("img", {
  width: "180px",
  objectFit: "cover",
  aspectRatio: 1,
  margin: "0 auto",
});

const Heading = styled("h3", {
  fontSize: "$sm",
  fontWeight: 600,
  color: "$hiContrast",
  textAlign: "left",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const PreviewTitle = styled(Heading, {
  color: "$highlight",
  fontSize: "$md",
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

const DragNDrop = styled("div", {
  width: "100%",
  minHeight: "80vh",
  background: "rgba(0, 0, 0, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  fontSize: "$md",
  color: "$hiContrast",
});

const IMG_TYPES = ["jpeg", "gif", "png", "apng", "svg", "bmp"];

const ScrollRestorationAtom = atom<Record<string, string | number>>({});

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Byte", "KB", "MB", "GB", "TB", "PB", 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const num = parseFloat((bytes / Math.pow(k, i)).toFixed(2));

  // Handle 1 Byte should be singluar, otherwise plural
  const unit = sizes[i] + (i === 0 && num !== 1 ? "s" : "");

  return `${num} ${unit}`;
}

export function Detail() {
  const [search, setSearchParams] = useSearchParams();
  const [index, setIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDND, setIsDND] = useState(false);
  const showDND = () => setIsDND(true);
  const hideDND = () => setIsDND(false);

  const params = useParams<{ bucket: string; "*": string }>();
  const navigate = useNavigate();
  const prefix = params["*"]!;
  const bucketList = useBucketList(params.bucket!, prefix!);
  const prefetch = useBucketListPrefetch();
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();
  const [scrollRestoration, setScrollRestoration] = useAtom(
    ScrollRestorationAtom
  );

  const explorerRef = useRef<HTMLDivElement>(null);
  const loaderRef = useRef<HTMLDivElement>(null);
  const loaderVisible = useOnScreen(loaderRef);

  const up = useMemo(() => {
    const splits = prefix.split("/").filter((x) => x);
    splits.pop();
    const result = splits.join("/");
    return result ? result + "/" : result;
  }, [prefix]);

  useLayoutEffect(() => {
    const item = scrollRestoration[prefix];
    if (!item) return;
    if (typeof item === "number") {
      explorerRef.current?.scrollTo({
        top: item,
      });
      return;
    }
    const element = document.querySelector(`[data-key="${item}"]`);
    if (!element) return;
  }, [prefix]);

  useLayoutEffect(() => {
    if (!isCreating) return;
    explorerRef.current?.scrollTo({
      top: 0,
    });
  }, [isCreating]);

  useHotkeys(window, [
    [
      ["a"],
      (e) => {
        if (isCreating) return;
        setIsCreating(true);
        e.preventDefault();
      },
    ],
    [
      ["esc"],
      () => {
        if (isCreating) {
          setIsCreating(false);
          return;
        }
        navigate(up);
      },
    ],
    [
      ["k"],
      () => {
        if (isCreating) return;
        setIndex((i) => i - 1);
      },
    ],
    [
      ["j"],
      () => {
        if (isCreating) return;
        setIndex((i) => i + 1);
      },
    ],
  ]);
  useEffect(() => setIndex(-1), [prefix]);

  useEffect(() => {
    if (loaderVisible && bucketList.hasNextPage) bucketList.fetchNextPage();
  }, [loaderVisible]);

  // TODO: This should go into hook
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

  const selectedFile = useMemo(() => {
    const file = search.get("file");
    if (!file) return null;
    const result = list.find((x) => x.type === "file" && x.Key?.endsWith(file));
    if (!result || result.type === "dir") return null;
    return result;
  }, [list, search]);

  const url = useBucketSignedUrl({
    bucket: params.bucket,
    key: selectedFile?.Key,
    etag: selectedFile?.ETag,
  });

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
      <Explorer ref={explorerRef}>
        {isCreating && (
          <ExplorerRow>
            {uploadFile.isLoading ? (
              <ExplorerRowSpinner size="sm" />
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
                    prefetch,
                  });
                  navigate(key);
                  // @ts-expect-error
                  e.target.value = "";
                  setScrollRestoration({
                    ...scrollRestoration,
                    [prefix]: key,
                  });
                  setIsCreating(false);
                }
              }}
            />
          </ExplorerRow>
        )}
        <FileDrop
          onFrameDragEnter={showDND}
          onFrameDragLeave={hideDND}
          onDragOver={showDND}
          onDragLeave={hideDND}
          onTargetClick={hideDND}
          onDrop={async (files) => {
            hideDND();
            if (!files || files?.length === 0) return;
            await uploadFile.mutateAsync({
              bucket: params.bucket!,
              key: prefix + files[0].name,
              payload: files[0],
            });
            bucketList.refetch();
          }}
        >
          {isDND ? (
            <DragNDrop>
              <RiDragDropLine size={64} />
              <Spacer vertical="sm" />
              <Caption>Drag and drop files here to upload.</Caption>
            </DragNDrop>
          ) : (
            <>
              {list.map((item, i) => (
                <ExplorerRow
                  data-key={item.sort}
                  active={i === index}
                  onMouseOver={() => {
                    if (item.type === "file") return;
                    prefetch(params.bucket!, item.Prefix!);
                  }}
                  key={item.sort}
                  onClick={() => {
                    setScrollRestoration({
                      ...scrollRestoration,
                      [prefix]: explorerRef.current?.scrollTop || 0,
                    });
                  }}
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
                  <ExplorerRowToolbar onClick={(e) => e.preventDefault()}>
                    <BiTrash
                      onClick={() =>
                        deleteFile.mutate({
                          bucket: params.bucket!,
                          key: item.sort,
                          prefix,
                        })
                      }
                      size={16}
                    />
                  </ExplorerRowToolbar>
                </ExplorerRow>
              ))}
              <Pager ref={loaderRef}>
                {bucketList.isLoading
                  ? "Loading..."
                  : bucketList.isError
                  ? "No buckets"
                  : bucketList.isFetchingNextPage
                  ? "Loading..."
                  : bucketList.hasNextPage
                  ? ""
                  : (bucketList.data?.pages.length || 0) > 1
                  ? "End of list"
                  : ""}
              </Pager>
            </>
          )}
        </FileDrop>
      </Explorer>
      {selectedFile && selectedFile.type === "file" && (
        <PreviewCard>
          <CloseIcon>
            <AiOutlineClose
              onClick={() => setSearchParams({})}
              color="#e27152"
              size={18}
            />
          </CloseIcon>
          <Image
            src={
              IMG_TYPES.includes(selectedFile.Key!.split(".").pop()!)
                ? url.data
                : "https://img.icons8.com/ios/12/e27152/file.svg"
            }
          />
          <PreviewTitle title={selectedFile.Key!.replace(prefix, "")}>
            {selectedFile.Key!.replace(prefix, "")}
          </PreviewTitle>
          <Caption>
            {selectedFile.Key!.split(".").pop()} - {formatFileSize(selectedFile.Size!)}
          </Caption>
          <Heading>Last modified</Heading>
          <Caption>{selectedFile!.LastModified?.toLocaleString()}</Caption>
          <OptionRow>
            <Button
              onClick={async () => {
                saveAs(url.data!, selectedFile.Key!.replace(prefix, ""));
              }}
            >
              Download
            </Button>
            {copied ? (
              <IoCheckmarkDone color="#e27152" size={18} />
            ) : (
              <BiCopy
                onClick={() => {
                  navigator.clipboard.writeText(url.data!);
                  setCopied(true);
                  // hide it false after 3 seconds
                  setTimeout(() => setCopied(false), 2000);
                }}
                color="#e27152"
                size={18}
              />
            )}
            {deleteFile.isLoading ? (
              <Spinner size="sm" />
            ) : (
              <BiTrash
                color="#e27152"
                size={18}
                onClick={async () => {
                  await deleteFile.mutateAsync({
                    bucket: params.bucket!,
                    key: selectedFile.Key!,
                    prefix,
                  });
                  setSearchParams({});
                  bucketList.refetch();
                }}
              />
            )}
          </OptionRow>
        </PreviewCard>
      )}
    </Root>
  );
}
