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
import { Button, Row, Spacer, Spinner, Toast, useOnScreen } from "~/components";
import { useEffect, useMemo, useRef, useState } from "react";
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

const Pager = styled("div", {
  width: "100%",
  padding: "$md",
  fontWeight: 600,
  fontSize: "$sm",
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

export function Detail() {
  const params = useParams<{ bucket: string; "*": string }>();
  const [search, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const prefix = params["*"]!;
  const bucketList = useBucketList(params.bucket!, prefix!);
  const prefetch = useBucketListPrefetch();
  const uploadFile = useUploadFile();
  const [index, setIndex] = useState(-1);

  const ref = useRef<HTMLDivElement>(null);
  const loaderVisible = useOnScreen(ref);

  const up = useMemo(() => {
    const splits = prefix.split("/").filter((x) => x);
    splits.pop();
    const result = splits.join("/");
    return result ? result + "/" : result;
  }, [prefix]);

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

  const [isCreating, setIsCreating] = useState(false);

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
        <Pager ref={ref}>
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
        </Pager>
      </Explorer>
      {selectedFile && selectedFile.type === "file" && (
        <PreviewCard>
          <CloseIcon>
            <AiOutlineClose
              onClick={() =>
                setSearchParams({
                  query: "",
                })
              }
              color="#e27152"
              size={18}
            />
          </CloseIcon>
          <Image src={url.data} />
          <PreviewTitle>{selectedFile.Key!.replace(prefix, "")}</PreviewTitle>
          <Caption>
            {selectedFile.Key!.split(".").pop()} - {selectedFile.Size! / 1000}{" "}
            KB
          </Caption>
          <Heading>Last modified</Heading>
          <Caption>{selectedFile!.LastModified?.toLocaleString()}</Caption>
          <OptionRow>
            <Button>Download</Button>
            <BiCopy
              onClick={() => {
                navigator.clipboard.writeText(url.data!);
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
