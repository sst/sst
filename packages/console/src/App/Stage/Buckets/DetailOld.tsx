import { styled } from "@stitches/react";
import { useParams } from "react-router-dom";
import {
  useBucketList,
  useDeleteFile,
  useRenameFile,
  useUploadFile,
} from "~/data/aws";
import { H3 } from "../components";
import { useEffect, useState } from "react";
import {
  Button,
  EmptyState,
  Popover,
  Row,
  Spinner,
  Toast,
  useOnScreen,
} from "~/components";
import { useAtom } from "jotai";
import { prefixAtom, fileAtom } from "../hooks";
import { FileDrop } from "react-file-drop";
import "./dnd.css";

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
import { HiOutlineTrash, HiDotsVertical } from "react-icons/hi";
import { useRef } from "react";
import { Tooltip } from "~/components";

const image_types = ["jpeg", "png", "gif", "jpg", "webp"];

const Flex = styled("div", {
  display: "flex",
  width: "100%",
  scrollBehavior: "smooth",
});

const Box = styled("div", {
  width: "100%",
  fontSize: "$sm",
  position: "relative",
});

const Toolbar = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "$md",
  justifyContent: "space-between",
  width: "100%",
  background: "$border",
  padding: 15,
  border: "none",
  fontSize: "$sm",
  position: "sticky",
  top: 0,
});

const ListItem = styled("div", {
  display: "flex",
  alignItems: "center",
  gap: "$md",
  width: "100% !important",
  border: "1px solid $border",
  padding: "$sm",
  cursor: "pointer",
  fontSize: "$sm",
  lineHeight: "1.5",
});

const Card = styled("div", {
  padding: "$md",
  border: "1px solid $highlight",
  display: "flex",
  flexDirection: "column",
  gap: "$md",
  minHeight: "60%",
  position: "fixed",
  width: "25%",
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
});

const LogLoader = styled("div", {
  width: "100%",
  padding: "$md",
  fontWeight: 600,
  color: "gray",
});

const PopContent = styled("div", {
  width: 100,
  padding: "$sm",
  fontWeight: 600,
  color: "gray",
  fontSize: 10,
  borderRadius: 5,
  backgroundColor: "$loContrast",
  border: "1px solid $border",
});

const Input = styled("input", {
  backgroundColor: "$loContrast",
  color: "$text",
  fontFamily: "$sans",
  border: "none",
  "&:focus": {
    outline: "none",
  },
  width: "90%",
});

interface ContentProps {
  ETag: string;
  Key: string;
  LastModified: Date;
  Size: number;
  StorageClass: string;
  url: string;
}

export function Detail() {
  const { name } = useParams<{ name?: string }>();
  const [prefix, setPrefix] = useAtom(prefixAtom);
  const [key, setKey] = useAtom(fileAtom);
  const [loading, setLoading] = useState(false);
  const [current_file, setCurrent_file] = useState<ContentProps>({});
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderShow, setFolderShow] = useState(false);

  const removeHashFromUrl = () => {
    const uri = window.location.toString();

    if (uri.indexOf("#") > 0) {
      const clean_uri = uri.substring(0, uri.indexOf("#"));

      window.history.replaceState({}, document.title, clean_uri);
    }
  };

  const {
    data,
    refetch,
    fetchNextPage,
    isError,
    hasNextPage,
    isFetching,
    isLoading,
    isFetchingNextPage,
    status,
  } = useBucketList(name!, prefix);
  const invoke = useUploadFile();
  const deleteFile = useDeleteFile();
  const renameFile = useRenameFile();

  useEffect(() => {
    refetch();
  }, [prefix]);

  // console.log(data);

  const ref: any = useRef<HTMLDivElement>();
  const loaderVisible = useOnScreen(ref);

  useEffect(() => {
    if (loaderVisible && hasNextPage) fetchNextPage();
  }, [loaderVisible]);

  const getTotalSize = () => {
    if (isLoading) return 0;
    // find total size of contents in all pages
    let total = 0;
    let files_count = 0;
    let folder_count = 0;
    data?.pages.forEach((page) => {
      files_count += page?.Contents?.length || 0;
      folder_count += page?.CommonPrefixes?.length || 0;
      page?.Contents.forEach((content) => {
        total += content?.Size || 0;
      });
    });

    return `${total / 1000} KB - (${folder_count} folders) (${
      prefix ? files_count - 1 : files_count
    } files)`;
  };

  // useEffect(() => {
  //   if (key) {
  //     const file = data?.pages[0].Contents?.find((f) => f.Key === key);
  //     if (file) {
  //       setCurrent_file(file);
  //     }
  //   }
  // }, [data]);

  return (
    <Box>
      <Toolbar>
        <Flex>
          <AiOutlineArrowLeft
            color="#e27152"
            onClick={() => {
              if (prefix.length === 0) return;
              setKey("");
              if (prefix.split("/").length > 2) {
                setPrefix(prefix.split("/").slice(0, -2).join("/") + "/");
              } else {
                setPrefix("");
                removeHashFromUrl();
              }
            }}
            style={{ opacity: prefix.length === 0 ? 0.5 : 1 }}
          />
          <p style={{ marginLeft: 10 }}>{prefix}</p>
        </Flex>
        <Flex
          css={{
            marginLeft: "auto",
            justifyContent: "flex-end",
            gap: "$md",
          }}
        >
          <Flex css={{ gap: "$sm", cursor: "pointer", width: "auto" }}>
            <AiOutlineUpload size={12} />
            <Input
              type="file"
              id="upload"
              onChange={async (e) => {
                await invoke.mutateAsync({
                  bucket: name!,
                  key: prefix + e.target.files[0].name,
                  body: e.target.files[0],
                });
                refetch();
              }}
              hidden
            />
            <label style={{ cursor: "pointer", fontSize: 12 }} htmlFor="upload">
              upload
            </label>
          </Flex>
          <Flex
            onClick={() => {
              setFolderShow((p) => !p);
            }}
            css={{
              gap: "$sm",
              cursor: "pointer",
              width: "auto",
            }}
          >
            <AiOutlinePlus size={12} />

            <label style={{ cursor: "pointer", fontSize: 12 }}>
              new folder
            </label>
          </Flex>
        </Flex>
      </Toolbar>
      <FileDrop
        onDrop={async (files: FileList) => {
          if (files?.length > 0) {
            setUploading(true);
            await invoke.mutateAsync({
              bucket: name!,
              key: prefix + files[0].name,
              payload: files[0],
            });
            refetch();
            setUploading(false);
          }
        }}
      >
        {/* <Flex css={{ width: "100%" }}> */}
        {isLoading && !isFetchingNextPage ? (
          <Row
            alignVertical="center"
            alignHorizontal="center"
            css={{
              height: "80vh",
            }}
          >
            <EmptyState>Fetching data</EmptyState>
          </Row>
        ) : (
          <Flex>
            <Flex
              css={{
                flexDirection: "column",
                width: "100%",
              }}
            >
              {folderShow && (
                <ListItem>
                  {uploading ? (
                    <Spinner size="sm" />
                  ) : (
                    <AiOutlineFolderOpen color="#e27152" />
                  )}
                  <Input
                    autoFocus
                    onBlur={() => {
                      setFolderShow(false);
                    }}
                    type="text"
                    onChange={(e) => {
                      setFolderName(e.target.value);
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === "Enter") {
                        setUploading(true);
                        await invoke.mutateAsync({
                          bucket: name!,
                          key: prefix + folderName.trim() + "/",
                        });
                        setFolderName("");
                        setUploading(false);
                        refetch().then(() => {
                          setFolderShow(false);
                        });
                      }
                    }}
                  />
                </ListItem>
              )}
              {/* folders */}
              {data?.pages.map((page) =>
                page.CommonPrefixes?.filter((f) => f?.Prefix !== "").map(
                  (p, idx) => (
                    <ListItem key={idx}>
                      <AiOutlineFolderOpen color="#e27152" />
                      <p
                        style={{
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          width: "95%",
                          fontSize: 12,
                        }}
                        onClick={() => {
                          setCurrent_file({});
                          setKey("");
                          setPrefix(p.Prefix!);
                        }}
                      >
                        {p?.Prefix?.replace(prefix, "") || (
                          <Spinner size="sm" />
                        )}
                      </p>
                      {/* <HiOutlineTrash
                        color="red"
                        size={24}
                        style={{
                          marginLeft: "auto",
                          marginRight: 10,
                          backgroundColor: "green",
                        }}
                        onClick={async () => {
                          await deleteFile.mutateAsync({
                            bucket: name!,
                            key: p.Prefix!,
                          });
                          refetch();
                        }}
                      /> */}
                      <div style={{ marginLeft: "auto" }}>
                        <Popover.Root>
                          <Popover.Trigger>
                            <HiDotsVertical color="#e27152" />
                          </Popover.Trigger>
                          <Popover.Content>
                            <PopContent>
                              <p
                                style={{
                                  cursor: "pointer",
                                }}
                                onClick={async () => {
                                  await deleteFile.mutateAsync({
                                    bucket: name!,
                                    key: p.Prefix!,
                                  });
                                  refetch();
                                }}
                              >
                                delete
                              </p>
                            </PopContent>
                          </Popover.Content>
                        </Popover.Root>
                      </div>
                    </ListItem>
                  )
                )
              )}

              {/* files */}
              {data?.pages
                .flatMap((page) => page?.Contents)
                .filter((f) => f?.Key !== prefix)
                // .filter((f) => f?.Key.includes(search))
                // // sort by timestamp
                // .sort(
                //   (a, b) =>
                //     a.LastModified?.getTime() - b?.LastModified?.getTime()
                // )
                .map((p, idx) => (
                  <ListItem
                    css={{
                      backgroundColor:
                        current_file?.Key === p.Key ? "$border" : "",
                    }}
                    key={idx}
                    onClick={() => {
                      // if the clicked item is an image, set loading to false
                      if (image_types.includes(p.Key?.split(".").pop()!)) {
                        setLoading(false);
                      }
                      setKey(p.Key!);
                      setCurrent_file(p);
                    }}
                  >
                    {image_types.includes(p.Key!.split(".").pop()!) ? (
                      <AiOutlineFileImage color="#e27152" />
                    ) : (
                      <AiOutlineFile color="#e27152" />
                    )}
                    <p
                      style={{
                        wordWrap: "break-word",
                        overflowWrap: "break-word",
                        maxWidth: "90%",
                        fontSize: 12,
                      }}
                    >
                      {p.Key?.replace(prefix, "")}
                    </p>
                  </ListItem>
                ))}
            </Flex>
            {/* <Flex
              css={{
                display: key ? "" : "none",
              }}
            > */}
            {/* file preview */}
            {key && Object.keys(current_file!).length > 0 && (
              <Card>
                {/* <div style={{ cursor: "pointer" }}> */}
                <HiOutlineTrash
                  style={{
                    position: "absolute",
                    right: "15%",
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    await deleteFile.mutateAsync({
                      bucket: name!,
                      key: current_file?.Key!,
                    });
                    removeHashFromUrl();
                    setCurrent_file({});
                    refetch();
                  }}
                  size={24}
                  color="#FF4500"
                />
                <AiFillCloseCircle
                  style={{
                    cursor: "pointer",
                    position: "absolute",
                    right: "2%",
                  }}
                  onClick={() => {
                    setCurrent_file({});
                    setKey("");
                    if (prefix.length === 0) removeHashFromUrl();
                  }}
                  size={24}
                  color="#e27152"
                />
                {/* </div> */}
                {!loading && <Spinner />}
                <Image
                  onLoad={() => setLoading(true)}
                  src={
                    image_types.includes(current_file?.Key.split(".").pop()) &&
                    current_file.Size / 1000 < 10000
                      ? current_file?.url
                      : "https://img.icons8.com/material-outlined/36/cccccc/file.svg"
                  }
                  style={loading ? {} : { display: "none" }}
                  alt="file preview"
                />
                <Tooltip.Root>
                  <Tooltip.Trigger>
                    <H3
                      css={{
                        color: "$highlight",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {current_file?.Key.replace(prefix, "")}
                    </H3>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    <p
                      style={{
                        overflowWrap: "break-word",
                      }}
                    >
                      {current_file?.Key.replace(prefix, "")}
                    </p>
                  </Tooltip.Content>
                </Tooltip.Root>
                <p
                  style={{
                    opacity: 0.6,
                  }}
                >
                  {current_file?.Key.split(".").pop()} -{" "}
                  {current_file?.Size / 1000} KB
                </p>
                <H3 css={{ fontSize: "$sm" }}>Last modified:</H3>
                <p
                  style={{
                    opacity: 0.6,
                  }}
                >
                  {new Date(current_file?.LastModified).toLocaleString()}
                </p>
                <Flex>
                  <Button>Download</Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(current_file?.url);
                    }}
                    css={{
                      backgroundColor: "$background",
                      color: "$highlight",
                    }}
                  >
                    Copy URL
                  </Button>
                </Flex>
              </Card>
            )}
            {/* </Flex> */}
          </Flex>
        )}
        {/* </Flex> */}
      </FileDrop>
      <div ref={ref}>
        {status === "success" && (
          <LogLoader>
            {isError
              ? "No buckets"
              : isFetchingNextPage
              ? "Loading..."
              : hasNextPage
              ? "Load More"
              : getTotalSize()}
          </LogLoader>
        )}
      </div>
      <Toast.Provider>
        {uploading && <Toast.Simple type="neutral">Uploading...</Toast.Simple>}
        {deleting && <Toast.Simple type="neutral">Deleting...</Toast.Simple>}
      </Toast.Provider>
    </Box>
  );
}
