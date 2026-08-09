"""Unit tests for the split-building code itself.

No dataset, no CSV: these build tiny synthetic inputs, so they stay fast and
run on a fresh clone.
"""

import csv

import numpy as np
import pytest

from dog_breed.data.splits import (
    CSV_DELIMITER,
    CSV_HEADER,
    convert_mat_to_list,
    load_mat_file,
    save_split_to_file,
)


def fake_mat(paths: list[str], labels: list[int]) -> dict:
    """Mimic the nesting scipy.io.loadmat produces for MATLAB cell arrays."""
    file_list = np.empty((len(paths), 1), dtype=object)
    for i, path in enumerate(paths):
        file_list[i, 0] = np.array([path])

    return {
        "file_list": file_list,
        "labels": np.array([[label] for label in labels], dtype=np.uint8),
    }


def test_labels_are_shifted_to_zero_indexed():
    """MATLAB counts classes from 1; PyTorch needs them from 0."""
    mat = fake_mat(["a/1.jpg", "b/2.jpg"], [1, 120])

    assert convert_mat_to_list(mat) == [("a/1.jpg", 0), ("b/2.jpg", 119)]


def test_labels_are_plain_ints_not_numpy_scalars():
    mat = fake_mat(["a/1.jpg"], [7])
    _, label = convert_mat_to_list(mat)[0]

    assert type(label) is int


def test_rejects_input_that_is_not_a_mat_dict():
    with pytest.raises(ValueError):
        convert_mat_to_list([("a/1.jpg", 0)])


def test_load_mat_file_reports_a_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_mat_file(tmp_path / "nope.mat")


def test_saved_file_has_a_header_and_the_split_column(tmp_path):
    out = tmp_path / "split.csv"
    save_split_to_file([("b.jpg", 1)], [("a.jpg", 0)], [("c.jpg", 2)], out)

    with open(out, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f, delimiter=CSV_DELIMITER))

    assert rows[0] == CSV_HEADER
    assert rows[1:] == [
        ["a.jpg", "0", "val"],
        ["b.jpg", "1", "train"],
        ["c.jpg", "2", "test"],
    ]


def test_saved_rows_are_sorted_regardless_of_input_order(tmp_path):
    out = tmp_path / "split.csv"
    save_split_to_file(
        [("z.jpg", 0), ("m.jpg", 0)], [("a.jpg", 0)], [("q.jpg", 0)], out
    )

    with open(out, newline="", encoding="utf-8") as f:
        paths = [row[0] for row in list(csv.reader(f, delimiter=CSV_DELIMITER))[1:]]

    assert paths == ["a.jpg", "m.jpg", "q.jpg", "z.jpg"]


def test_creates_the_destination_directory(tmp_path):
    out = tmp_path / "does" / "not" / "exist" / "split.csv"
    save_split_to_file([("a.jpg", 0)], [], [], out)

    assert out.exists()
