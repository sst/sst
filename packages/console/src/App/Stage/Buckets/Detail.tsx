import { useAtom } from "jotai";
import { atomWithHash } from "jotai/utils";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
import { useMemo, useState } from "react";

const Root = styled("div", {
  height: "100%",
  display: "flex",
  flexDirection: "column",
});

const Toolbar = styled("div", {
  background: "$border",
  // TODO: wtf why do I have to do this
  height: 45 + 1 / 3,
  flexShrink: 0,
  fontSize: "$sm",
  gap: "$sm",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 $md",
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
});

const ToolbarButton = styled("div", {
  fontSize: "$sm",
  cursor: "pointer",
  fontWeight: 600,
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
  const prefix = params["*"]!;
  const bucketList = useBucketList(params.bucket!, prefix!);
  const prefetch = useBucketListPrefetch();
  const uploadFile = useUploadFile();
  const up = useMemo(() => {
    const splits = prefix.split("/").filter((x) => x);
    splits.pop();
    const result = splits.join("/");
    return result ? result + "/" : result;
  }, [prefix]);

  const [isCreating, setIsCreating] = useState(false);

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
            <AiOutlinePlus />
            new folder
          </ToolbarButton>

          <ToolbarButton>
            <AiOutlinePlus />
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
            <label htmlFor="upload">upload</label>
          </ToolbarButton>
        </ToolbarRight>
      </Toolbar>
      <Explorer>
        {isCreating && (
          <ExplorerRow>
            {uploadFile.isLoading || bucketList.isRefetching ? (
              <Spinner size="sm" />
            ) : (
              <AiOutlineFolderOpen size={16} />
            )}
            <Spacer horizontal="sm" />
            <ExplorerCreateInput
              autoFocus
              disabled={uploadFile.isLoading}
              onBlur={() => setIsCreating(false)}
              onKeyPress={async (e) => {
                // @ts-ignore
                const value = e.target.value;
                if (e.key === "Enter") {
                  // @ts-ignore
                  await uploadFile.mutateAsync({
                    bucket: params.bucket!,
                    key: prefix + value.trim() + "/",
                  });
                  await bucketList.refetch();
                  e.target.value = "";
                  setIsCreating(false);
                }
              }}
            />
          </ExplorerRow>
        )}
        {bucketList.data?.pages
          .flatMap((x) => x.CommonPrefixes || [])
          .map((dir) => (
            <ExplorerRow
              onMouseOver={() => prefetch(params.bucket!, dir.Prefix!)}
              key={dir.Prefix}
              as={Link}
              to={dir.Prefix!}
            >
              <AiOutlineFolderOpen size={16} />
              <Spacer horizontal="sm" />
              <ExplorerKey>{dir.Prefix!.replace(prefix, "")}</ExplorerKey>
            </ExplorerRow>
          ))}
        {bucketList.data?.pages
          .flatMap((x) => x.Contents || [])
          .filter((x) => x.Key !== prefix)
          .map((file) => (
            <ExplorerRow key={file.Key}>
              <AiOutlineFileImage size={16} />
              <Spacer horizontal="sm" />
              <ExplorerKey>{file.Key!.replace(prefix, "")}</ExplorerKey>
            </ExplorerRow>
          ))}
      </Explorer>
    </Root>
  );
}
