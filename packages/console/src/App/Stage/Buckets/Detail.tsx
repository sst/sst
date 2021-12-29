import { useAtom } from "jotai";
import { atomWithHash } from "jotai/utils";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useHotkey } from "@react-hook/hotkey";
import {
  useBucketList,
  useBucketListPrefetch,
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
} from "react-icons/ai";
import { Row, Spacer, Spinner } from "~/components";
import { useEffect, useMemo, useState } from "react";

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

export function Detail() {
  const params = useParams<{ bucket: string; "*": string }>();
  const navigate = useNavigate();
  const prefix = params["*"]!;
  const bucketList = useBucketList(params.bucket!, prefix!);
  const prefetch = useBucketListPrefetch();
  const uploadFile = useUploadFile();
  const [index, setIndex] = useState(-1);

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
      </Explorer>
    </Root>
  );
}
