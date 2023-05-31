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
  useBucketObject,
  useConstruct,
  useDeleteFile,
  useUploadFile,
} from "~/data/aws";
import { styled } from "~/stitches.config";
import {
  AiOutlineFile,
  AiOutlineDelete,
  AiOutlineFolderOpen,
  AiOutlineArrowLeft,
  AiOutlineUpload,
  AiOutlineClose,
} from "react-icons/ai";
import { Button, Spacer, Spinner, useOnScreen } from "~/components";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BiCopy, BiTrash } from "react-icons/bi";
import { IoCheckmarkDone } from "react-icons/io5";
import { saveAs } from "file-saver";
import { atom, useAtom } from "jotai";
import { ImFileEmpty } from "react-icons/im";

const Root = styled("div", {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  position: "relative",
});

const Toolbar = styled("div", {
  background: "$accent",
  flexShrink: 0,
  fontSize: "$sm",
  gap: "$sm",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 $lg",
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
const ToolbarSpinner = styled(Spinner, {
  marginRight: 6,
  marginLeft: -3,
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
  padding: "0 $lg",
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
  whiteSpace: "pre-wrap",
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
  padding: "$md $lg",
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
  objectFit: "contain",
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

const Placeholder = styled(ImFileEmpty, {
  margin: "0 auto",
});

const ScrollRestorationAtom = atom<Record<string, string | number>>({});

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Byte", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const num = parseFloat((bytes / Math.pow(k, i)).toFixed(2));

  // Handle 1 Byte should be singular, otherwise plural
  const unit = sizes[i] + (i === 0 && num !== 1 ? "s" : "");

  return `${num} ${unit}`;
}

function isFileSizeTooLargeToPreview(bytes: number): boolean {
  return bytes > 10000000; // 10 MB
}

export function Detail() {
  const [search, setSearchParams] = useSearchParams();
  const [index, setIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const params = useParams<{ stack: string; bucket: string; "*": string }>();
  const bucket = useConstruct("Bucket", params.stack!, params.bucket!);
  const navigate = useNavigate();
  const prefix = params["*"]!;
  const bucketList = useBucketList(bucket.data.name, prefix!);
  const prefetch = useBucketListPrefetch();
  const uploadFile = useUploadFile();
  const uploadFolder = useUploadFile();
  const deleteFile = useDeleteFile();
  const deleteFolder = useDeleteFile();
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
    return encodeURIComponent(result ? result + "/" : result);
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

  const isEmpty = prefix.includes("/")
    ? (bucketList.data?.pages?.[0]?.KeyCount || 100) <= 1
    : (bucketList.data?.pages?.[0]?.KeyCount || 100) === 0;

  const selectedFile = useBucketObject({
    bucket: bucket.data.name,
    key: search.get("file") || undefined,
    etag: "static",
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
          {isEmpty && (
            <ToolbarButton
              onClick={async () => {
                if (!confirm("Are you sure you want to delete this folder?"))
                  return;
                await deleteFolder.mutateAsync({
                  bucket: bucket.data.name,
                  key: prefix,
                  prefix,
                  visible: [],
                });
                navigate(up);
              }}
            >
              {deleteFolder.isLoading ? (
                <ToolbarSpinner size="sm" />
              ) : (
                <AiOutlineDelete size={16} />
              )}
              Delete
            </ToolbarButton>
          )}
          <ToolbarButton onClick={() => setIsCreating(true)}>
            <AiOutlineFolderOpen size={16} />
            New
          </ToolbarButton>

          <ToolbarButton as="label" htmlFor="upload">
            {uploadFile.isLoading ? (
              <ToolbarSpinner size="sm" />
            ) : (
              <AiOutlineUpload size={16} />
            )}
            <input
              type="file"
              id="upload"
              onChange={async (e) => {
                if (!e.target.files) return;
                const [file] = e.target.files;
                const key = prefix + file.name;
                await uploadFile.mutateAsync({
                  key,
                  bucket: bucket.data.name,
                  payload: e.target.files[0],
                  prefix,
                  visible: getVisiblePages(),
                  contentType: file.type,
                });
                setSearchParams({
                  file: key,
                });
                // @ts-expect-error
                e.target.value = null;
              }}
              hidden
            />
            Upload
          </ToolbarButton>
        </ToolbarRight>
      </Toolbar>
      <Explorer ref={explorerRef}>
        {isCreating && (
          <ExplorerRow>
            {uploadFolder.isLoading ? (
              <ExplorerRowSpinner size="sm" />
            ) : (
              <AiOutlineFolderOpen size={16} />
            )}
            <Spacer horizontal="sm" />
            <ExplorerCreateInput
              autoFocus
              placeholder="New folder name..."
              disabled={uploadFolder.isLoading}
              onBlur={() => setIsCreating(false)}
              onKeyPress={async (e) => {
                // @ts-expect-error
                const value = e.target.value;
                const key = prefix + value.trim() + "/";
                if (e.key === "Enter") {
                  await uploadFolder.mutateAsync({
                    bucket: bucket.data.name,
                    key,
                    prefetch,
                    prefix,
                    visible: [],
                  });
                  navigate(encodeURIComponent(key));
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
        {bucketList.data?.pages.map((page, pageIndex) => (
          <div data-page={pageIndex} key={pageIndex}>
            {[
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
            ]
              .filter((item) => item.sort !== prefix)
              .sort((a, b) => (a.sort < b.sort ? -1 : 1))
              .map((item, i) => (
                <ExplorerRow
                  data-key={item.sort}
                  active={i === index}
                  onMouseOver={() => {
                    if (item.type === "file") return;
                    prefetch(bucket.data.name, item.Prefix!);
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
                      : `${encodeURIComponent(item.Prefix!)}`
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
          </div>
        ))}
        <Pager ref={loaderRef}>
          {bucketList.isLoading
            ? "Loading..."
            : bucketList.isError
            ? "No buckets"
            : isEmpty
            ? "No files"
            : bucketList.hasNextPage
            ? ""
            : "End of list"}
        </Pager>
      </Explorer>
      {selectedFile.data && (
        <PreviewCard>
          <CloseIcon>
            <AiOutlineClose
              onClick={() => setSearchParams({})}
              color="#e27152"
              size={18}
            />
          </CloseIcon>
          {selectedFile.data.info.ContentType?.startsWith("image") &&
          !isFileSizeTooLargeToPreview(
            selectedFile.data.info.ContentLength!
          ) ? (
            <Image src={selectedFile.data.url} />
          ) : (
            <Placeholder size={180} color="#e27152" />
          )}
          <PreviewTitle title={selectedFile.data.key.replace(prefix, "")}>
            {selectedFile.data.key.replace(prefix, "")}
          </PreviewTitle>
          <Caption>
            {selectedFile.data.key.split(".").pop()} -{" "}
            {formatFileSize(selectedFile.data.info.ContentLength!)}
          </Caption>
          <Heading>Last modified</Heading>
          <Caption>
            {selectedFile.data.info.LastModified?.toLocaleString()}
          </Caption>
          <OptionRow>
            <Button
              onClick={async () => {
                saveAs(
                  selectedFile.data.url,
                  selectedFile.data.key.replace(prefix, "")
                );
              }}
            >
              Download
            </Button>
            {copied ? (
              <IoCheckmarkDone color="#e27152" size={18} />
            ) : (
              <BiCopy
                onClick={() => {
                  navigator.clipboard.writeText(selectedFile.data.url);
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
                  if (!confirm("Are you sure you want to delete this file?"))
                    return;
                  await deleteFile.mutateAsync({
                    bucket: bucket.data.name,
                    key: selectedFile.data.key,
                    prefix,
                    visible: getVisiblePages(),
                  });
                  setSearchParams({});
                }}
              />
            )}
          </OptionRow>
        </PreviewCard>
      )}
    </Root>
  );
}

function getVisiblePages() {
  return [...document.querySelectorAll("[data-page]")]
    .map((el, index) => (isVisible(el as any, el.parentElement!) ? index : -1))
    .filter((i) => i > -1);
}

const isVisible = function (el: HTMLElement, container: HTMLElement) {
  const eleTop = el.offsetTop;
  const eleBottom = eleTop + el.clientHeight;

  const containerTop = container.scrollTop;
  const containerBottom = containerTop + container.clientHeight;

  // The element is fully visible in the container
  return (
    (eleTop >= containerTop && eleBottom <= containerBottom) ||
    // Some part of the element is visible in the container
    (eleTop < containerTop && containerTop < eleBottom) ||
    (eleTop < containerBottom && containerBottom < eleBottom)
  );
};
