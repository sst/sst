import { unmarshall } from "@aws-sdk/util-dynamodb";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { equals, pick } from "remeda";
import { Button, SidePanel, Spacer, Toast } from "~/components";
import { useDeleteItem, usePutItem } from "~/data/aws/dynamodb";
import { styled } from "~/stitches.config";

type EditorProps = ReturnType<typeof useEditor>["props"];

const TextArea = styled("textarea", {
  padding: "$lg",
  border: "1px solid $border",
  fontSize: "$sm",
  background: "$accent",
  color: "$hiContrast",
  lineHeight: 1.5,
  borderRadius: 6,
  width: "100%",
  resize: "none",
  fontFamily: "$sans",
  "&:focus": {
    outline: "none",
  },
});

export function Editor(props: EditorProps) {
  const form = useForm<{ item: string }>();
  const toasts = Toast.use();
  const putItem = usePutItem();
  const deleteItem = useDeleteItem();
  const onSubmit = form.handleSubmit(async (data) => {
    const parsed = JSON.parse(data.item);
    if (editing) {
      const nextKeys = pick(parsed, Object.keys(props.keys));
      if (JSON.stringify(nextKeys) !== JSON.stringify(props.keys)) {
        toasts.create({
          type: "danger",
          text: "Cannot edit keys",
        });
        return;
      }
    }
    await putItem.mutateAsync({
      item: parsed,
      tableName: props.table,
      original: props.item,
    });
    props.onClose();
  });
  const editing = Boolean(props.keys);
  console.log(props.keys);
  useEffect(() => {
    form.reset({ item: JSON.stringify(unmarshall(props.item || {}), null, 2) });
  }, [props.item]);
  if (!props.show) return null;
  return (
    <SidePanel.Root>
      <SidePanel.Header>
        {editing ? "Edit" : "Creating"}
        <SidePanel.Close onClick={props.onClose} />
      </SidePanel.Header>
      <SidePanel.Content>
        <form onSubmit={onSubmit}>
          <TextArea {...form.register("item")} rows={15} />
          <Spacer vertical="lg" />
          <SidePanel.Toolbar>
            {editing && (
              <Button
                color="danger"
                onClick={async () => {
                  await deleteItem.mutateAsync({
                    keys: props.keys,
                    tableName: props.table,
                    original: props.item,
                  });
                  props.onClose();
                }}
                type="button"
              >
                Delete
              </Button>
            )}
            <Button color="info" type="submit">
              Save
            </Button>
          </SidePanel.Toolbar>
        </form>
      </SidePanel.Content>
    </SidePanel.Root>
  );
}

export function useEditor(table: string) {
  const [item, setItem] = useState<any>();
  const [keys, setKeys] = useState<any>();
  const [show, setShow] = useState(false);
  return {
    props: { item, table, keys, show, onClose: () => setShow(false) },
    create() {
      setShow(true);
      setItem(undefined);
      setKeys(undefined);
    },
    edit(item: any, keys: any) {
      setItem(item);
      setKeys(keys);
      setShow(true);
    },
  };
}
