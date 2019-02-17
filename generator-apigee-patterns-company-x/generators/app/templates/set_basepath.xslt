<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xsl:stylesheet version="1.0"
 xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
 <xsl:template match="/">
 <xsl:for-each select="@*|node()">
	<xsl:apply-templates mode="a"/>
 </xsl:for-each>
 </xsl:template>
 <xsl:template match="@*|node()" mode="a">
    <xsl:for-each select="@*|node()">
	 <xsl:copy />
	 <xsl:apply-templates mode="a"/>
	 </xsl:for-each>
	 <xsl:copy />
</xsl:template>
</xsl:stylesheet>
		   