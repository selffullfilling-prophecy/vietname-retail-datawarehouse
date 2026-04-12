using Analytics.Contracts.Metadata;

namespace Analytics.Ssas.Metadata;

public sealed class SsasMetadataProvider : ISsasMetadataProvider
{
    public IReadOnlyList<CubeMetadataDto> GetCubes()
    {
        // Placeholder metadata until ADOMD.NET integration is wired in the next step.
        return
        [
            new CubeMetadataDto(
                Name: "SalesCube",
                Caption: "Sales Analysis",
                Dimensions:
                [
                    new DimensionMetadataDto(
                        Name: "Dim Time",
                        Caption: "Time",
                        Attributes: ["Nam", "Quy", "Thang"],
                        Hierarchies: ["Nam > Quy > Thang"]),
                    new DimensionMetadataDto(
                        Name: "Dim Store",
                        Caption: "Store",
                        Attributes: ["Bang", "Thanhpho", "Macuahang"],
                        Hierarchies: ["Bang > Thanhpho > Macuahang"]),
                    new DimensionMetadataDto(
                        Name: "Dim Customer",
                        Caption: "Customer",
                        Attributes: ["Bang", "Thanhpho", "KhachHang", "IsKhdulich", "IsKhbuudien"],
                        Hierarchies: ["Bang > Thanhpho > KhachHang"]),
                    new DimensionMetadataDto(
                        Name: "Dim Product",
                        Caption: "Product",
                        Attributes: ["Mamh", "Mota", "Kichco", "Trongluong"],
                        Hierarchies: [])
                ],
                Measures:
                [
                    new MeasureMetadataDto("Tongtien", "Doanh thu", "Sum"),
                    new MeasureMetadataDto("Soluongban", "San luong ban", "Sum")
                ]),
            new CubeMetadataDto(
                Name: "InventoryCube",
                Caption: "Inventory Analysis",
                Dimensions:
                [
                    new DimensionMetadataDto(
                        Name: "Dim Time",
                        Caption: "Time",
                        Attributes: ["Nam", "Quy", "Thang"],
                        Hierarchies: ["Nam > Quy > Thang"]),
                    new DimensionMetadataDto(
                        Name: "Dim Store",
                        Caption: "Store",
                        Attributes: ["Bang", "Thanhpho", "Macuahang"],
                        Hierarchies: ["Bang > Thanhpho > Macuahang"]),
                    new DimensionMetadataDto(
                        Name: "Dim Product",
                        Caption: "Product",
                        Attributes: ["Mamh", "Mota", "Kichco", "Trongluong"],
                        Hierarchies: [])
                ],
                Measures:
                [
                    new MeasureMetadataDto("Soluongtonkho", "Ton kho binh quan", "AverageOfChildren")
                ])
        ];
    }
}
